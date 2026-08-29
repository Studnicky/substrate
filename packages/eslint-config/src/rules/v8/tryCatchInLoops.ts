import type {
  Rule, Scope
} from 'eslint';

import { Predicates } from '@studnicky/types';

import { FUNCTION_TYPES } from '../shared/constants/LoopContextConstants.js';
import { LoopContext } from '../shared/LoopContext.js';

// MEASURED, Node v24, N = 5,000,000, 3 warm-up calls + median of 7 timed calls
// (scratchpad bench: identical per-iteration body, one arm wrapping the read in
// try/catch, both summing `a[i]`):
//
//   no try/catch      3.307 ms
//   with try/catch    3.329 ms   -> 1.007x  (noise-level, not a real cost)
//
// The rule's ORIGINAL premise — "V8 cannot optimize functions containing
// try-catch in hot paths" — predates TurboFan's 2018 native try/catch
// support and is FALSE today: the measured cost is indistinguishable from
// noise. Per the "disproven premise -> update to proven intent, don't
// delete" rule, this is retained as a STRUCTURAL constraint, not a
// performance one: it forces error handling for a per-iteration operation
// out of the hot body and into a separately named, independently testable
// static method, which is a real (if not V8-measurable) readability/testing
// win. The `v8Optimization/` message prefix used elsewhere in this package
// for genuinely-measured rules has been dropped here for the same reason
// `switch-statements` dropped it: it would protect no V8 mechanism.
//
// MIGRATED onto `LoopContext.isPerIteration` (was `FunctionScope.isInsideLoop`)
// to close the `.forEach`-shaped bypass documented in `shared/LoopContext.ts`:
// `chunks.forEach((chunk) => { try { risky(chunk); } catch { ... } })` is a
// per-element loop body in every sense that matters here, but the lexical
// "did we cross a loop keyword" walk `FunctionScope.isInsideLoop` performs
// treats the callback as an opaque function boundary and never reports it.
// Applied at both call sites below: the direct TryStatement check, and the
// same-file helper call-site analysis (so a helper reachable ONLY through a
// `.forEach` callback is now also caught).

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
      if (FUNCTION_TYPES.has(current.type)) {
        return current;
      }
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
      const id = Predicates.isRecord(raw.id) ? raw.id : undefined;
      const name = id !== undefined && typeof id.name === 'string' ? id.name : undefined;

      if (name === undefined) {
        return undefined;
      }

      const declared = context.sourceCode.getDeclaredVariables(functionNode);

      const result = declared.find((variable) => {
        const isMatchingName = variable.name === name;

        return isMatchingName;
      });

      return result;
    }

    if (functionNode.type === 'FunctionExpression' || functionNode.type === 'ArrowFunctionExpression') {
      const parent = functionNode.parent;

      if (parent?.type !== 'VariableDeclarator') {
        return undefined;
      }

      const raw = parent as unknown as Record<string, unknown>;
      const id = Predicates.isRecord(raw.id) ? raw.id : undefined;

      if (id?.type !== 'Identifier' || typeof id.name !== 'string') {
        return undefined;
      }

      const declared = context.sourceCode.getDeclaredVariables(parent);

      const result = declared.find((variable) => {
        const isMatchingId = variable.name === id.name;

        return isMatchingId;
      });

      return result;
    }

    return undefined;
  }
}

class CallSiteAnalysis {
  // A reference is a direct call site (`name(...)`) rather than some other use
  // (passed as a callback value, reassigned, etc.) when its identifier is the
  // callee of a CallExpression.
  public static isDirectCallReference(reference: Scope.Reference): boolean {
    const identifier = reference.identifier as unknown as { readonly 'parent'?: unknown };
    const parent = identifier.parent;

    if (!Predicates.isRecord(parent) || parent.type !== 'CallExpression') {
      return false;
    }

    const result = parent.callee === (reference.identifier as unknown);

    return result;
  }

  // Bounded, same-file call-graph check: true only when every reference to the
  // function is (a) a resolvable direct call and (b) per-iteration (loop keyword
  // OR built-in per-element iteration callback — see `LoopContext`).
  // Any reference that is not a direct call (passed by reference, exported,
  // reassigned, etc.) makes the call graph unresolvable within this bounded
  // analysis, so the function is conservatively left unflagged.
  public static allCallSitesInsideLoops(variable: Scope.Variable, context: Rule.RuleContext): boolean {
    const readReferences = variable.references.filter((reference: Scope.Reference) => {
      const result = !reference.isWrite();

      return result;
    });

    if (readReferences.length === 0) {
      return false;
    }

    const result = readReferences.every((reference: Scope.Reference) => {
      if (!CallSiteAnalysis.isDirectCallReference(reference)) {
        return false;
      }
      const callExpression = (reference.identifier as unknown as { readonly 'parent': Rule.Node }).parent;

      const isPerIterationCall = LoopContext.isPerIteration(callExpression, context);

      return isPerIterationCall;
    });

    return result;
  }
}

export const tryCatchInLoops: Rule.RuleModule = {
  'create': (context) => {
    const pending: PendingTryEntryInterface[] = [];

    const onTryStatement: NonNullable<Rule.RuleListener['TryStatement']> = (node) => {
      if (LoopContext.isPerIteration(node, context)) {
        context.report({
          'messageId': 'tryCatchInLoop',
          'node': node
        });

        return;
      }

      // Not per-iteration by itself — check the bounded, control-flow-vs-lexical-scope
      // gap: a helper function whose try/catch never sits inside a loop textually, but
      // which is itself called exclusively from per-iteration positions. See
      // CallSiteAnalysis for the residual limitation of this bounded analysis
      // (documented on the module).
      const functionNode = EnclosingFunctionFinder.find(node);

      if (functionNode !== undefined) {
        pending.push({
          'functionNode': functionNode, 'tryNode': node
        });
      }
    };

    const onProgramExit: NonNullable<Rule.RuleListener['Program:exit']> = () => {
      const pendingLength = pending.length;

      for (let index = 0; index < pendingLength; index += 1) {
        const entry = pending.at(index);

        if (entry === undefined) {
          continue;
        }

        const variable = DeclaredFunctionVariable.resolve(entry.functionNode, context);

        if (variable === undefined) {
          continue;
        }

        if (CallSiteAnalysis.allCallSitesInsideLoops(variable, context)) {
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
      'description': 'Require try-catch to be extracted out of loop bodies (including `.forEach`-shaped per-element callbacks) into a named, independently testable static method. Also flags a same-file helper function whose try-catch is not lexically per-iteration but whose every call site is. This is a structural/readability constraint, not a performance one: measured 1.007x at 5,000,000 iterations on Node v24 — TurboFan\'s try/catch support since 2018 makes the original "V8 cannot optimize this" claim false.',
      'recommended': false
    },
    'messages': { 'tryCatchInLoop': 'tryCatchInLoops: try-catch inside a loop (or a per-element iteration callback) belongs in a separately named static method, not inlined in the loop body.' },
    'schema': [],
    'type': 'problem'
  }
};
