import type { Rule } from 'eslint';

import { CallIdentity } from '../shared/CallIdentity.js';
import {
  FROM_METHODS, FROM_OWNERS, MESSAGE, RULE_NAME
} from './constants/ArrayFromMapCallbackConstants.js';

// See docs/eslint/rules/v8/array-from-map-callback.md for the measured rationale. Not
// loop-gated: the cost is paid once per call, proportional to the iterable's size.

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
