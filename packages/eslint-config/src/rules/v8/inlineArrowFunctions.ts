import type { Rule } from 'eslint';

import { ObjectGuard } from '../shared/ObjectGuard.js';
import { InlineCallablePosition } from './inlineCallablePosition.js';

// PROVEN (`npx eslint` probe against this repo's own `eslint.config.mjs:145`,
// `'arrow-body-style': ['error', 'always']`): every arrow function in this
// codebase is forced to a `{ ... }` block body BEFORE this rule ever sees
// it, including a trivial single-statement forwarding arrow like
// `key: () => { return doThing(); }`. The rule's own description ("Disallow
// inline MULTI-STATEMENT arrow functions...") implied `body.type !==
// 'BlockStatement'` was doing duty as a statement-count filter — that only
// works if trivial arrows stay expression-bodied, which `arrow-body-style`
// makes impossible. The result: the "multi-statement" exemption was
// UNREACHABLE, and every arrow in a flagged position was reported
// regardless of size. Fixed here with a real statement count, so a
// single-statement forwarding arrow (the idiomatic, cheap shape) is exempt
// exactly as the rule's description always claimed.

class ArrowBodyStatementCount {
  public static of(body: Record<string, unknown>): number {
    const statements = body.body;

    const result = Array.isArray(statements) ? statements.length : 0;
    return result;
  }
}

export const inlineArrowFunctions: Rule.RuleModule = {
  'create': (context) => {
    const onArrowFunctionExpression: NonNullable<Rule.RuleListener['ArrowFunctionExpression']> = (node) => {
      const rawNode = node as unknown as Record<string, unknown>;
      const body: unknown = rawNode.body;

      if (!ObjectGuard.isObject(body) || body.type !== 'BlockStatement') {
        return;
      }

      // Real statement-count check — see module header for why `body.type
      // === 'BlockStatement'` alone cannot serve as one in this codebase.
      if (ArrowBodyStatementCount.of(body) < 2) {
        return;
      }

      // Loop-callback arguments (`items.forEach(() => { ... })` inside a
      // loop), ternary-branched/default-parameter closures, and
      // dispatch-map property values (including via nested array-literal
      // construction, e.g. `Object.fromEntries([["a", () => {...}]])`) are
      // all provably-per-iteration allocation sites — not just the direct
      // `Property > ObjectExpression` shape.
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
