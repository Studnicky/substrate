import type { Rule } from 'eslint';

import { ObjectGuard } from '../shared/ObjectGuard.js';
import { MESSAGE, RULE_NAME } from './constants/ArrayConcatOutsideLoopsConstants.js';
import { FUNCTION_TYPES } from './constants/ArrayScanOutsideLoopsConstants.js';
import { FunctionScope } from './functionScope.js';

class CalleeShape {
  // `arr.concat(...)` — a MemberExpression callee whose property is the
  // literal identifier `concat`.
  public static isConcatMember(node: unknown): boolean {
    if (!ObjectGuard.isObject(node) || node.type !== 'MemberExpression') { return false; }
    const property = node.property;

    return ObjectGuard.isObject(property) && property.type === 'Identifier' && property.name === 'concat';
  }

  // `arr.concat.call(...)` / `arr.concat.apply(...)` — the call/apply
  // indirection wraps a concat-member callee one level deeper.
  public static isConcatCallOrApply(node: unknown): boolean {
    if (!ObjectGuard.isObject(node) || node.type !== 'MemberExpression') { return false; }
    const property = node.property;
    if (!ObjectGuard.isObject(property) || property.type !== 'Identifier') { return false; }
    if (property.name !== 'call' && property.name !== 'apply') { return false; }

    return CalleeShape.isConcatMember(node.object);
  }
}

class ScopeLookup {
  // Resolves an identifier to its Variable by walking up the lexical scope
  // chain by name, mirroring ReceiverOrigin.findDeclarationNode in
  // arrayScanOutsideLoops.ts but returning the Variable (for its
  // `.references`) rather than just the declaration node.
  public static findVariable(identifierNode: Rule.Node, context: Rule.RuleContext): {
    readonly 'defs': readonly { readonly 'node': unknown }[];
    readonly 'references': readonly { readonly 'identifier': Rule.Node; readonly 'init'?: boolean }[];
  } | undefined {
    const name = (identifierNode as unknown as { readonly 'name': string }).name;
    let scope = context.sourceCode.getScope(identifierNode) as unknown as {
      readonly 'upper': typeof scope | null;
      readonly 'variables': readonly {
        readonly 'defs': readonly { readonly 'node': unknown }[];
        readonly 'name': string;
        readonly 'references': readonly { readonly 'identifier': Rule.Node; readonly 'init'?: boolean }[];
      }[];
    } | null;

    while (scope !== null) {
      const { variables } = scope;
      const variablesLength = variables.length;
      for (let index = 0; index < variablesLength; index += 1) {
        const candidate = variables.at(index);
        if (candidate?.name === name) { return candidate; }
      }
      scope = scope.upper;
    }

    return undefined;
  }
}

class AliasOrigin {
  // For `const c = arr.concat; c(x);`, resolves the bare Identifier callee
  // `c` back to its declarator and reports true only when the initializer is
  // itself a concat-member expression.
  public static isConcatAlias(identifierNode: Rule.Node, context: Rule.RuleContext): boolean {
    const variable = ScopeLookup.findVariable(identifierNode, context);
    const declaratorNode = variable?.defs.at(0)?.node;
    if (!ObjectGuard.isObject(declaratorNode) || declaratorNode.type !== 'VariableDeclarator') { return false; }

    return CalleeShape.isConcatMember(declaratorNode.init);
  }
}

class WrapperReachability {
  // Walks up from a concat call that is not directly inside a loop, looking
  // for the nearest enclosing function — the shape a same-file helper takes.
  public static findEnclosingFunction(node: Rule.Node): Rule.Node | undefined {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      if (FUNCTION_TYPES.has(current.type)) { return current; }
      current = current.parent;
    }

    return undefined;
  }

  // Only two helper shapes are provable without full call-graph analysis: a
  // named `function helper() {}` declaration, or `const helper = () => {}` /
  // `const helper = function () {}`. Both expose a single stable Identifier
  // whose references are the helper's call sites.
  public static findHelperNameNode(functionNode: Rule.Node): Rule.Node | undefined {
    const raw = functionNode as unknown as { readonly 'id'?: unknown; readonly 'parent': unknown; readonly 'type': string };

    if (raw.type === 'FunctionDeclaration' && ObjectGuard.isObject(raw.id) && raw.id.type === 'Identifier') {
      return raw.id as unknown as Rule.Node;
    }

    const parent = raw.parent;
    if (!ObjectGuard.isObject(parent) || parent.type !== 'VariableDeclarator' || parent.init !== functionNode) { return undefined; }
    if (!ObjectGuard.isObject(parent.id) || parent.id.type !== 'Identifier') { return undefined; }

    const declaration = (parent as unknown as { readonly 'parent': unknown }).parent;
    if (!ObjectGuard.isObject(declaration) || declaration.type !== 'VariableDeclaration' || declaration.kind !== 'const') { return undefined; }

    return parent.id as unknown as Rule.Node;
  }

  // Proves that every call site of the helper runs once per loop iteration:
  // all of the variable's non-declaration references must themselves be call
  // expressions (not passed around as a value — that is unprovable), and
  // every one of those call sites must be inside one of the 5 loop types.
  // A helper with zero call sites, or any non-call reference, is left
  // unflagged rather than guessed at.
  public static isCalledOnlyFromLoops(nameNode: Rule.Node, context: Rule.RuleContext): boolean {
    const variable = ScopeLookup.findVariable(nameNode, context);
    if (variable === undefined) { return false; }

    const callSites: Rule.Node[] = [];
    const { references } = variable;
    const referencesLength = references.length;

    for (let index = 0; index < referencesLength; index += 1) {
      const reference = references.at(index);
      if (reference === undefined) { continue; }
      if (reference.init === true) { continue; }

      const identifier = reference.identifier;
      const identifierParent = (identifier as unknown as { readonly 'parent': unknown }).parent;
      const isCallSite = ObjectGuard.isObject(identifierParent)
        && identifierParent.type === 'CallExpression'
        && identifierParent.callee === identifier;

      if (!isCallSite) { return false; }
      callSites.push(identifier);
    }

    if (callSites.length === 0) { return false; }

    return callSites.every(FunctionScope.isInsideLoop);
  }
}

export const arrayConcatOutsideLoops: Rule.RuleModule = {
  'create': (context) => {
    const report = (node: Rule.Node): void => {
      context.report({ 'messageId': 'forbidden', 'node': node });
    };

    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      const { callee } = node;

      if (CalleeShape.isConcatMember(callee)) {
        if (FunctionScope.isInsideLoop(node)) {
          report(node);
          return;
        }

        // Fix B: the direct call is not syntactically inside a loop, but it
        // may still run once per iteration if it lives in a same-file helper
        // that is only ever invoked from inside a loop.
        const enclosingFunction = WrapperReachability.findEnclosingFunction(node);
        if (enclosingFunction === undefined) { return; }

        const nameNode = WrapperReachability.findHelperNameNode(enclosingFunction);
        if (nameNode === undefined) { return; }

        if (WrapperReachability.isCalledOnlyFromLoops(nameNode, context)) { report(node); }
        return;
      }

      if (CalleeShape.isConcatCallOrApply(callee)) {
        if (FunctionScope.isInsideLoop(node)) { report(node); }
        return;
      }

      if (ObjectGuard.isObject(callee) && callee.type === 'Identifier' && FunctionScope.isInsideLoop(node)) {
        if (AliasOrigin.isConcatAlias(callee as unknown as Rule.Node, context)) { report(node); }
      }
    };

    return { 'CallExpression': onCallExpression };
  },
  'meta': {
    'docs': {
      'description': MESSAGE,
      'recommended': false
    },
    'messages': { 'forbidden': `${RULE_NAME}: ${MESSAGE}` },
    'schema': [],
    'type': 'problem'
  }
};
