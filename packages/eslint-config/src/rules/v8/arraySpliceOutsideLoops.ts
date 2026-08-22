import type { Rule } from 'eslint';

import { CallIdentity } from '../shared/CallIdentity.js';
import { LoopContext } from '../shared/LoopContext.js';
import {
  MESSAGE, RULE_NAME, SPLICE_METHODS, SPLICE_OWNERS
} from './constants/ArraySpliceOutsideLoopsConstants.js';

// A8/A14 FIX: the previous implementation was a bare `SelectorRule` descendant
// selector — `:matches(ForStatement, ...) CallExpression[callee.property.name="splice"]`
// — with NO function-boundary check at all. A descendant combinator matches at ANY
// nesting depth, so it flagged `splice` inside a callback that is defined once inside a
// loop but never RUNS per-iteration:
//
//   for (const id of ids) {
//     fetchThen((data) => { data.splice(0, 1); });   // reported — but this callback
//   }                                                 // runs once per network response,
//                                                      // not once per loop iteration.
//
// `LoopContext.isPerIteration` fixes this: it stops at a function boundary unless that
// function is itself a proven per-element iteration callback (`.forEach()`, `.map()`,
// …), so a deferred callback like the one above — not an argument to any per-element
// iteration method — correctly falls through unflagged. Identity is resolved via
// `CallIdentity` for the same reason as every sibling rule in this file set: name
// matching missed `arr[SPLICE_KEY](0, 1)` and falsely flagged a same-named user method.

export const arraySpliceOutsideLoops: Rule.RuleModule = {
  'create': (context) => {
    const onCallExpression: NonNullable<Rule.RuleListener['CallExpression']> = (node) => {
      if (!CallIdentity.isBuiltinCall(node, context, SPLICE_METHODS, SPLICE_OWNERS)) {
        return;
      }
      if (!LoopContext.isPerIteration(node, context)) {
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
