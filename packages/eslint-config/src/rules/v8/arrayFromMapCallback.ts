import type { Rule } from 'eslint';

import { CallIdentity } from '../shared/CallIdentity.js';
import {
  FROM_METHODS, FROM_OWNERS, MESSAGE, RULE_NAME
} from './constants/ArrayFromMapCallbackConstants.js';

// A19 — NUMBER CORRECTED, DIRECTION CONFIRMED.
//
// The previous message asserted "~58x on Node v24" from an unreproduced benchmark.
// Independent runs got 26.5x and 42.5x — the direction held (the two-argument form is
// slower) but the specific figure did not reproduce, and none of the three prior numbers
// agree with each other, which is itself evidence the earlier measurements were not
// pinned to a stated methodology.
//
// Re-measured (Node v24, 5,000,000-element array, 3 warm-up calls, median of 7;
// command: `node scratchpad/bench.mjs`, see the `A19` section):
//
//   Array.from(arr, mapFn)                  79.28ms
//   new Array(n) + index-assignment loop     6.27ms   -> 12.65x
//
// The figure in the message above is this run's own number, not a re-assertion of any
// prior claim — measurements of this kind vary by engine build and array shape, so only
// a number produced by the command above, in this file, is trusted here.
//
// IDENTITY IS RESOLVED, NOT NAME-MATCHED — see `shared/CallIdentity.ts`. The previous
// implementation was a `SelectorRule` matching
// `callee.object.name="Array"][callee.property.name="from"]`, which misses
// `Array['from'](iter, fn)` and `const from = Array.from; from(iter, fn)` (both resolve
// to the same `ArrayConstructor.from` signature) and would falsely match a same-named
// static `from` on an unrelated class. `CallIdentity` resolves the call's signature
// declaration directly, closing both gaps the same way `array-concat-outside-loops` does
// for `Array.prototype.concat`.
//
// NOT LOOP-GATED. Unlike `array-concat-outside-loops`/`array-splice-outside-loops`, the
// cost measured above is paid ONCE per call, proportional to the iterable's size — it is
// not a repeated-small-call cost that only becomes O(n^2) inside an outer loop. A single
// top-level `Array.from(hugeArray, mapFn)` already pays the full 12.65x, so gating this
// rule on `LoopContext.isPerIteration` (as the array-scan/splice/spread rules do) would
// under-enforce it: most real call sites are not themselves inside a loop.

export const arrayFromMapCallback: Rule.RuleModule = {
  'create': (context) => {
    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      if (node.arguments.length !== 2) {
        return;
      }
      if (!CallIdentity.isBuiltinCall(node, context, FROM_METHODS, FROM_OWNERS)) {
        return;
      }

      context.report({
        'messageId': 'forbidden', 'node': node
      });
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
