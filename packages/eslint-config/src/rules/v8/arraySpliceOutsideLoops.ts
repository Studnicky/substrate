import type { Rule } from 'eslint';

import { CallIdentity } from '../shared/CallIdentity.js';
import { LoopContext } from '../shared/LoopContext.js';
import {
  MESSAGE, RULE_NAME, SPLICE_METHODS, SPLICE_OWNERS
} from './constants/ArraySpliceOutsideLoopsConstants.js';

// LoopContext.isPerIteration stops at a function boundary unless that function is itself a
// proven per-element iteration callback; see docs/eslint/rules/v8/array-splice-outside-loops.md.

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
