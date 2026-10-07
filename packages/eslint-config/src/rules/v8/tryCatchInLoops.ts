import type {
  Rule, Scope
} from 'eslint';

import { Predicates } from '#runtime';

import { AstHelpers } from '../shared/astHelpers.js';
import { FUNCTION_TYPES } from '../shared/constants/LoopContextConstants.js';
import { DeclaredFunctionVariable } from '../shared/DeclaredFunctionVariable.js';
import { LoopContext } from '../shared/LoopContext.js';

// Structural/testability constraint, not a V8-performance claim; benchmark and scope
// rationale: docs/eslint/rules/v8/try-catch-in-loops.md.

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

class CallSiteAnalysis {
  // True only when the reference's identifier is the callee of a CallExpression,
  // not passed as a callback value, reassigned, or otherwise indirect.
  public static isDirectCallReference(reference: Scope.Reference): boolean {
    const parent = AstHelpers.getParent(reference.identifier);

    if (!Predicates.isRecord(parent) || parent.type !== 'CallExpression') {
      return false;
    }

    const result = parent.callee === reference.identifier;

    return result;
  }

  // True only when every reference is a resolvable direct call in a per-iteration
  // position; any indirect reference leaves the function conservatively unflagged.
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
      const callExpression = AstHelpers.getParent(reference.identifier);

      if (callExpression === null) {
        return false;
      }

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

      // Not per-iteration lexically — queue it for the bounded call-site check
      // (CallSiteAnalysis) in case every call site is itself per-iteration.
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
      // Bounded call-graph check: same-file helpers only. See doc for the indirect
      // call shapes (callback, `.bind()`, re-exported, `obj.method()`) left undetected.
      'description': 'Require try-catch to be extracted out of loop bodies (including `.forEach`-shaped per-element callbacks) into a named, independently testable static method. Also flags a same-file helper function whose try-catch is not lexically per-iteration but whose every call site is. This is a structural/readability constraint, not a performance one: measured 1.007x at 5,000,000 iterations on Node v24 — TurboFan\'s try/catch support since 2018 makes the original "V8 cannot optimize this" claim false.',
      'recommended': false
    },
    'messages': { 'tryCatchInLoop': 'tryCatchInLoops: try-catch inside a loop (or a per-element iteration callback) belongs in a separately named static method, not inlined in the loop body.' },
    'schema': [],
    'type': 'problem'
  }
};
