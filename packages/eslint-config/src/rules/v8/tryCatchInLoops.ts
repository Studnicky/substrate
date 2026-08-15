import type { Rule, Scope } from 'eslint';

import { ObjectGuard } from '../shared/ObjectGuard.js';
import { FUNCTION_TYPES } from './constants/FunctionScopeConstants.js';
import { FunctionScope } from './functionScope.js';

interface PendingTryEntryInterface {
  readonly 'functionNode': Rule.Node;
  readonly 'tryNode': Rule.Node;
}

class EnclosingFunctionFinder {
  // Nearest ancestor function (declaration/expression/arrow) containing `node`, or
  // undefined if `node` sits at module scope with no enclosing function at all.
  public static find(node: Rule.Node): Rule.Node | undefined {
    let current: Rule.Node | null = node.parent;

    while (current !== null) {
      if (FUNCTION_TYPES.has(current.type)) { return current; }
      current = current.parent;
    }

    return undefined;
  }
}

class DeclaredFunctionVariable {
  // Resolves the scope variable that calls to `functionNode` would reference:
  // the function's own name for a `function foo() {}` declaration, or the
  // bound identifier for `const foo = function () {}` / `const foo = () => {}`.
  public static resolve(functionNode: Rule.Node, context: Rule.RuleContext): Scope.Variable | undefined {
    if (functionNode.type === 'FunctionDeclaration') {
      const raw = functionNode as unknown as Record<string, unknown>;
      const id = ObjectGuard.isObject(raw.id) ? raw.id : undefined;
      const name = id !== undefined && typeof id.name === 'string' ? id.name : undefined;
      if (name === undefined) { return undefined; }

      const declared = context.sourceCode.getDeclaredVariables(functionNode);
      return declared.find((variable) => { return variable.name === name; });
    }

    if (functionNode.type === 'FunctionExpression' || functionNode.type === 'ArrowFunctionExpression') {
      const parent = functionNode.parent;
      if (parent?.type !== 'VariableDeclarator') { return undefined; }

      const raw = parent as unknown as Record<string, unknown>;
      const id = ObjectGuard.isObject(raw.id) ? raw.id : undefined;
      if (id?.type !== 'Identifier' || typeof id.name !== 'string') { return undefined; }

      const declared = context.sourceCode.getDeclaredVariables(parent);
      return declared.find((variable) => { return variable.name === id.name; });
    }

    return undefined;
  }
}

class CallSiteAnalysis {
  // A reference is a direct call site (`name(...)`) rather than some other use
  // (passed as a callback value, reassigned, etc.) when its identifier is the
  // callee of a CallExpression.
  public static isDirectCallReference(ref: Scope.Reference): boolean {
    const identifier = ref.identifier as unknown as { readonly 'parent'?: unknown };
    const parent = identifier.parent;
    if (!ObjectGuard.isObject(parent) || parent.type !== 'CallExpression') { return false; }
    return parent.callee === (ref.identifier as unknown);
  }

  // Bounded, same-file call-graph check: true only when every reference to the
  // function is (a) a resolvable direct call and (b) lexically inside a loop.
  // Any reference that is not a direct call (passed by reference, exported,
  // reassigned, etc.) makes the call graph unresolvable within this bounded
  // analysis, so the function is conservatively left unflagged.
  public static allCallSitesInsideLoops(variable: Scope.Variable): boolean {
    const readRefs = variable.references.filter((ref: Scope.Reference) => { return !ref.isWrite(); });
    if (readRefs.length === 0) { return false; }

    return readRefs.every((ref: Scope.Reference) => {
      if (!CallSiteAnalysis.isDirectCallReference(ref)) { return false; }
      const callExpression = (ref.identifier as unknown as { readonly 'parent': Rule.Node }).parent;
      return FunctionScope.isInsideLoop(callExpression);
    });
  }
}

export const tryCatchInLoops: Rule.RuleModule = {
  'create': (context) => {
    const pending: PendingTryEntryInterface[] = [];

    const onTryStatement: NonNullable<Rule.RuleListener['TryStatement']> = (node) => {
      if (FunctionScope.isInsideLoop(node)) {
        context.report({
          'messageId': 'tryCatchInLoop',
          'node': node
        });
        return;
      }

      // Not lexically inside a loop — check the bounded, control-flow-vs-lexical-scope
      // gap: a helper function whose try/catch never sits inside a loop textually, but
      // which is itself called exclusively from inside loop bodies. See CallSiteAnalysis
      // for the residual limitation of this bounded analysis (documented on the module).
      const functionNode = EnclosingFunctionFinder.find(node);
      if (functionNode !== undefined) {
        pending.push({ 'functionNode': functionNode, 'tryNode': node });
      }
    };

    const onProgramExit: NonNullable<Rule.RuleListener['Program:exit']> = () => {
      const pendingLength = pending.length;
      for (let index = 0; index < pendingLength; index += 1) {
        const entry = pending.at(index);
        if (entry === undefined) { continue; }

        const variable = DeclaredFunctionVariable.resolve(entry.functionNode, context);
        if (variable === undefined) { continue; }

        if (CallSiteAnalysis.allCallSitesInsideLoops(variable)) {
          context.report({
            'messageId': 'tryCatchInLoop',
            'node': entry.tryNode
          });
        }
      }
    };

    return {
      'Program:exit': onProgramExit,
      'TryStatement': onTryStatement
    };
  },
  'meta': {
    'docs': {
      // Residual limitation (documented, not fixed): this bounded call-graph check only
      // covers same-file helpers whose EVERY reference is a resolvable direct call
      // (`name(...)`). Multi-file call graphs, conditionally-called helpers (called from
      // both inside and outside a loop), and helpers invoked indirectly (passed as a
      // callback, `.bind()`, re-exported, called via `obj.method()`) remain undetected —
      // full call-graph analysis would be required to close those gaps.
      'description': 'Disallow try-catch blocks inside loops; V8 cannot optimize functions containing try-catch in hot paths. Also flags a same-file helper function whose try-catch is not lexically inside a loop but whose every call site is.',
      'recommended': false
    },
    'messages': { 'tryCatchInLoop': 'v8Optimization/tryCatchInLoops: try-catch inside a loop prevents V8 optimization. Extract the try-catch to a static class method.' },
    'schema': [],
    'type': 'problem'
  }
};
