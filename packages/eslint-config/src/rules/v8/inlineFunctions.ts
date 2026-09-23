import type { Rule } from 'eslint';

import { InlineCallablePosition } from './inlineCallablePosition.js';

// The rule sees source POSITION, not call frequency; see docs/eslint/rules/v8/inline-functions.md
// for the measured cost and which positions count as proven per-iteration allocation.
export const inlineFunctions: Rule.RuleModule = {
  'create': (context) => {
    const onFunctionExpression: NonNullable<Rule.RuleListener['FunctionExpression']> = (node) => {
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
