import type { Rule } from 'eslint';

import { Predicates } from '#runtime';

import { DeclareThenReturnShape } from '../shared/DeclareThenReturnShape.js';
import { InlineCallablePosition } from './inlineCallablePosition.js';

// `arrow-body-style: ['error', 'always']` forces every arrow into a block body, so a
// real statement count is required. Effective-count rationale: docs/eslint/rules/v8/inline-arrow-functions.md.

class ArrowBodyStatementCount {
  /** Effective statement count; a `const <name>` immediately followed by `return <name>;` counts as one. */
  public static of(body: Record<string, unknown>): number {
    const statements = body.body;

    if (!Predicates.isArray(statements)) {
      return 0;
    }

    const rawCount = statements.length;

    if (rawCount < 2) {
      return rawCount;
    }

    const shape = DeclareThenReturnShape.of(statements.at(-2), statements.at(-1));
    const result = shape?.declarationKind === 'const' ? rawCount - 1 : rawCount;

    return result;
  }
}

export const inlineArrowFunctions: Rule.RuleModule = {
  'create': (context) => {
    const onArrowFunctionExpression: NonNullable<Rule.RuleListener['ArrowFunctionExpression']> = (node) => {
      const body = node.body;

      if (!Predicates.isRecord(body) || body.type !== 'BlockStatement') {
        return;
      }

      // Real statement-count check — see module header for why `body.type
      // === 'BlockStatement'` alone cannot serve as one in this codebase.
      if (ArrowBodyStatementCount.of(body) < 2) {
        return;
      }

      // Covers loop-callback arguments, ternary/default-parameter closures, and
      // array-literal-nested dispatch-map values; positions: InlineCallablePosition.
      if (!InlineCallablePosition.isFlagged(node, context)) {
        return;
      }

      context.report({
        'messageId': 'forbidden', 'node': node
      });
    };

    return { 'ArrowFunctionExpression': onArrowFunctionExpression };
  },
  'meta': {
    'docs': {
      'description': 'Disallow inline multi-statement (2+ statements) arrow functions in a position provably rebuilt on every call/iteration (dispatch map built inside a loop, loop-callback argument, or default-parameter closure whose owning function is called only from per-iteration sites). Single-statement arrows and pre-built (module-scope or one-shot) positions are exempt.',
      'recommended': false
    },
    'messages': { 'forbidden': 'v8Optimization/inlineArrowFunctions: Inline multi-statement arrow function in a position rebuilt on every call/iteration. Extract to a static class method or named function, or hoist to module/static scope so it is built once.' },
    'schema': [],
    'type': 'problem'
  }
};
