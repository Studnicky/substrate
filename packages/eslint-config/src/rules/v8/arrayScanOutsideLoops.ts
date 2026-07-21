import type { Rule } from 'eslint';
import type ts from 'typescript';

import { ObjectGuard } from '../shared/ObjectGuard.js';
import { FunctionScope } from './functionScope.js';

const SCAN_METHODS: ReadonlySet<string> = new Set(['every', 'filter', 'find', 'includes', 'indexOf', 'some']);
const LOOP_TYPES: ReadonlySet<string> = new Set(['DoWhileStatement', 'ForInStatement', 'ForOfStatement', 'ForStatement', 'WhileStatement']);
const FUNCTION_TYPES: ReadonlySet<string> = new Set(['ArrowFunctionExpression', 'FunctionDeclaration', 'FunctionExpression']);

interface ParserServicesInterface {
  readonly 'esTreeNodeToTSNodeMap'?: Map<unknown, ts.Node>;
  readonly 'program'?: ts.Program;
}

class TypeGuards {
  static hasTypeServices(value: unknown): value is Required<ParserServicesInterface> {
    if (!ObjectGuard.isObject(value)) { return false; }
    if (!('program' in value) || !ObjectGuard.isObject(value.program)) { return false; }
    if (typeof value.program.getTypeChecker !== 'function') { return false; }
    if (!('esTreeNodeToTSNodeMap' in value) || !ObjectGuard.isObject(value.esTreeNodeToTSNodeMap)) { return false; }

    // Duck-type the Map: avoid cross-realm instanceof failures when the Map is from a different module instance.
    return typeof value.esTreeNodeToTSNodeMap.get === 'function';
  }
}

class LoopContext {
  // Mirrors FunctionScope.isInsideLoop's walk, but returns the loop node
  // itself so the receiver's declaration site can be range-checked against it.
  public static findEnclosing(node: Rule.Node): Rule.Node | undefined {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      if (LOOP_TYPES.has(current.type)) { return current; }
      if (FUNCTION_TYPES.has(current.type)) { return undefined; }
      current = current.parent;
    }

    return undefined;
  }
}

class ReceiverOrigin {
  // Walks a (possibly chained) MemberExpression down to its root Identifier —
  // `entry.variable.references` resolves to `entry`. Any other root shape
  // (ThisExpression, CallExpression, ...) returns undefined: such receivers
  // are not lexical variables the rule can prove are loop-local, so the
  // caller's default is to keep flagging rather than guess.
  public static findRootIdentifier(node: unknown): Rule.Node | undefined {
    let current = node;

    while (ObjectGuard.isObject(current)) {
      if (current.type === 'Identifier') { return current as unknown as Rule.Node; }
      if (current.type !== 'MemberExpression') { return undefined; }
      current = current.object;
    }

    return undefined;
  }

  // Resolves `identifierNode` to its declaring AST node by walking up the
  // lexical scope chain by name — the standard identifier-resolution algorithm.
  public static findDeclarationNode(identifierNode: Rule.Node, context: Rule.RuleContext): Rule.Node | undefined {
    const name = (identifierNode as unknown as { readonly 'name': string }).name;
    let scope = context.sourceCode.getScope(identifierNode) as { readonly 'upper': typeof scope | null; readonly 'variables': readonly { readonly 'defs': readonly { readonly 'node': unknown }[]; readonly 'name': string }[] } | null;

    while (scope !== null) {
      for (const candidate of scope.variables) {
        if (candidate.name === name) {
          return candidate.defs[0]?.node as Rule.Node | undefined;
        }
      }
      scope = scope.upper;
    }

    return undefined;
  }

  // A receiver is proven loop-local when its root identifier's declaration
  // site falls within the enclosing loop's own AST range — e.g. a for-of
  // loop's own binding, or a `const` declared in the loop body. Such a value
  // is freshly derived every iteration, not the same stable collection
  // re-scanned each time, so it is not the anti-pattern this rule targets.
  public static isProvenLoopLocal(receiverObject: unknown, loopNode: Rule.Node, context: Rule.RuleContext): boolean {
    const rootIdentifier = ReceiverOrigin.findRootIdentifier(receiverObject);
    if (rootIdentifier === undefined) { return false; }

    const declarationNode = ReceiverOrigin.findDeclarationNode(rootIdentifier, context);
    if (declarationNode === undefined) { return false; }

    const declRange = (declarationNode as unknown as { readonly 'range': readonly [number, number] }).range;
    const loopRange = (loopNode as unknown as { readonly 'range': readonly [number, number] }).range;

    return declRange[0] >= loopRange[0] && declRange[1] <= loopRange[1];
  }
}

export const arrayScanOutsideLoops: Rule.RuleModule = {
  'create': (context) => {
    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      const { callee } = node;

      if (callee.type !== 'MemberExpression') { return; }
      if (callee.property.type !== 'Identifier' || !SCAN_METHODS.has(callee.property.name)) { return; }
      if (!FunctionScope.isInsideLoop(node)) { return; }

      const loopNode = LoopContext.findEnclosing(node);
      if (loopNode !== undefined && ReceiverOrigin.isProvenLoopLocal(callee.object, loopNode, context)) { return; }

      // Property name matches and the receiver is not proven loop-local — now
      // prove the receiver is an array via the type checker. indexOf/includes
      // also exist on String.prototype; without this proof we cannot tell a
      // linear array scan from a substring search.
      // "If we cannot prove it, we do not enforce it."
      const servicesUnknown: unknown = context.sourceCode.parserServices;
      if (!TypeGuards.hasTypeServices(servicesUnknown)) { return; }

      const { object } = callee;
      const tsNode = servicesUnknown.esTreeNodeToTSNodeMap.get(object);
      if (tsNode === undefined) { return; }

      const checker = servicesUnknown.program.getTypeChecker();
      const type = checker.getTypeAtLocation(tsNode);

      if (!checker.isArrayType(type) && !checker.isTupleType(type)) { return; }

      context.report({ 'messageId': 'forbidden', 'node': node });
    };

    return { 'CallExpression': onCallExpression };
  },
  'meta': {
    'docs': {
      'description': 'Disallow linear array scans (find/filter/indexOf/includes/some/every) inside loop bodies against a loop-invariant collection.',
      'recommended': false
    },
    'messages': { 'forbidden': 'v8Optimization/arrayScanOutsideLoops: These methods scan linearly. Called every loop iteration, this becomes O(n^2) — hoist the collection into a Map/Set outside the loop, or compute the result once and reuse it.' },
    'schema': [],
    'type': 'problem'
  }
};
