import type { Rule } from 'eslint';

import { InlineCallablePosition } from './inlineCallablePosition.js';

// MEASURED: closure allocation is 2.3x costly WHEN GENUINELY HOT (rebuilt
// every loop iteration) — but the rule cannot see call FREQUENCY, only
// source POSITION. The predecessor's "rebuilt in some enclosing function"
// heuristic for the dispatch-map-value branch, and its complete absence of
// any gate on the default-parameter-value branch, both flagged a one-shot
// init factory (called exactly once) identically to real hot-loop code.
// See `inlineCallablePosition.ts` for the evidence-based fix: both branches
// now require proof of per-iteration allocation (loop position, or a
// bounded call-site-reachability check for default parameters), not merely
// "sits inside a function" or "exists at all". The third (loop-call-argument)
// branch was already evidence-based — genuinely requiring a loop — and is
// unchanged in spirit, only migrated onto `LoopContext` so a `.forEach`-
// shaped loop callback is recognized the same as a `for`/`while` keyword.
export const inlineFunctions: Rule.RuleModule = {
  'create': (context) => {
    const onFunctionExpression: NonNullable<Rule.RuleListener['FunctionExpression']> = (node) => {
      // Loop-callback arguments (`items.forEach(function () { ... })` inside
      // a loop), ternary-branched/default-parameter closures, and
      // dispatch-map property values (including via nested array-literal
      // construction, e.g. `new Map([["a", function () {...}]])`) are all
      // provably-per-iteration allocation sites — not just the direct
      // `Property > ObjectExpression` shape.
      if (!InlineCallablePosition.isFlagged(node, context)) {
        return;
      }

      context.report({
        'messageId': 'forbidden', 'node': node
      });
    };

    return { 'FunctionExpression': onFunctionExpression };
  },
  'meta': {
    'docs': {
      'description': 'Disallow inline function expressions in a position provably rebuilt on every call/iteration (dispatch map built inside a loop, loop-callback argument, or default-parameter closure whose owning function is called only from per-iteration sites). A one-shot factory (called once, e.g. at module init) is exempt — call frequency, not mere function nesting, is what the measured 2.3x cost requires.',
      'recommended': false
    },
    'messages': { 'forbidden': 'v8Optimization/inlineFunctions: Inline function expression in a position rebuilt on every call/iteration. Extract to a static class method or named function, or hoist to module/static scope so it is built once.' },
    'schema': [],
    'type': 'problem'
  }
};
