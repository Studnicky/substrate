import type { Rule } from 'eslint';

import { FunctionScope } from './functionScope.js';

export const tryCatchInLoops: Rule.RuleModule = {
  'create': (context) => {
    const onTryStatement: NonNullable<Rule.RuleListener['TryStatement']> = (node) => {
      if (FunctionScope.isInsideLoop(node)) {
        context.report({
          'messageId': 'tryCatchInLoop',
          'node': node
        });
      }
    };

    return { 'TryStatement': onTryStatement };
  },
  'meta': {
    'docs': {
      'description': 'Disallow try-catch blocks inside loops; V8 cannot optimize functions containing try-catch in hot paths.',
      'recommended': false
    },
    'messages': { 'tryCatchInLoop': 'v8Optimization/tryCatchInLoops: try-catch inside a loop prevents V8 optimization. Extract the try-catch to a static class method.' },
    'schema': [],
    'type': 'problem'
  }
};
