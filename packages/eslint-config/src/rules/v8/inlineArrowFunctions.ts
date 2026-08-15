import type { Rule } from 'eslint';

import { ObjectGuard } from '../shared/ObjectGuard.js';
import { InlineCallablePosition } from './inlineCallablePosition.js';

export const inlineArrowFunctions: Rule.RuleModule = {
  'create': (context) => {
    const onArrowFunctionExpression: NonNullable<Rule.RuleListener['ArrowFunctionExpression']> = (node) => {
      const rawNode = node as unknown as Record<string, unknown>;
      const body: unknown = rawNode.body;

      if (!ObjectGuard.isObject(body) || body.type !== 'BlockStatement') { return; }

      // Loop-callback arguments (`items.forEach(() => { ... })` inside a
      // loop), ternary-branched/default-parameter closures, and
      // dispatch-map property values (including via nested array-literal
      // construction, e.g. `Object.fromEntries([["a", () => {...}]])`) are
      // all rebuilt-per-call/iteration allocation sites — not just the
      // direct `Property > ObjectExpression` shape.
      if (!InlineCallablePosition.isFlagged(node)) { return; }

      context.report({ 'messageId': 'forbidden', 'node': node });
    };

    return { 'ArrowFunctionExpression': onArrowFunctionExpression };
  },
  'meta': {
    'docs': {
      'description': 'Disallow inline multi-statement arrow functions in a position rebuilt on every call/iteration (dispatch map, loop callback, ternary branch, or default-parameter closure). Pre-built (module-scope or `static`) maps are exempt.',
      'recommended': false
    },
    'messages': { 'forbidden': 'v8Optimization/inlineArrowFunctions: Inline multi-statement arrow function in a position rebuilt on every call/iteration. Extract to a static class method or named function, or hoist to module/static scope so it is built once.' },
    'schema': [],
    'type': 'problem'
  }
};
