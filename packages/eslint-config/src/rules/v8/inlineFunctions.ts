import type { Rule } from 'eslint';

import { InlineCallablePosition } from './inlineCallablePosition.js';

export const inlineFunctions: Rule.RuleModule = {
  'create': (context) => {
    const onFunctionExpression: NonNullable<Rule.RuleListener['FunctionExpression']> = (node) => {
      // Loop-callback arguments (`items.forEach(function () { ... })` inside
      // a loop), ternary-branched/default-parameter closures, and
      // dispatch-map property values (including via nested array-literal
      // construction, e.g. `new Map([["a", function () {...}]])`) are all
      // rebuilt-per-call/iteration allocation sites — not just the direct
      // `Property > ObjectExpression` shape.
      if (!InlineCallablePosition.isFlagged(node)) { return; }

      context.report({ 'messageId': 'forbidden', 'node': node });
    };

    return { 'FunctionExpression': onFunctionExpression };
  },
  'meta': {
    'docs': {
      'description': 'Disallow inline function expressions in a position rebuilt on every call/iteration (dispatch map, loop callback, ternary branch, or default-parameter closure). Pre-built (module-scope or `static`) maps are exempt.',
      'recommended': false
    },
    'messages': { 'forbidden': 'v8Optimization/inlineFunctions: Inline function expression in a position rebuilt on every call/iteration. Extract to a static class method or named function, or hoist to module/static scope so it is built once.' },
    'schema': [],
    'type': 'problem'
  }
};
