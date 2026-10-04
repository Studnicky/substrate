import type { Rule } from 'eslint';

import { SUPPRESSION_PATTERN } from './constants/CleanDiagnosticsConstants.js';

// No autofixer, deliberately: removing a suppression comment can delete code sharing its
// line or resurface a suppressed diagnostic elsewhere — see clean-diagnostics.md.

export const cleanDiagnostics: Rule.RuleModule = {
  'create': (context) => {
    const onProgram: NonNullable<Rule.RuleListener['Program']> = () => {
      const { sourceCode } = context;
      const comments = sourceCode.getAllComments();
      const commentsLength = comments.length;

      for (let index = 0; index < commentsLength; index += 1) {
        const comment = comments.at(index);

        if (comment === undefined) {
          continue;
        }
        if (!SUPPRESSION_PATTERN.test(comment.value)) {
          continue;
        }

        if (comment.loc !== null && comment.loc !== undefined) {
          context.report({
            'loc': comment.loc,
            'messageId': 'suppression'
          });
        } else {
          context.report({
            'messageId': 'suppression',
            'node': sourceCode.ast
          });
        }
      }
    };

    return { 'Program': onProgram };
  },
  'meta': {
    'docs': { 'description': 'Disallow lint and type suppression comments.' },
    'messages': { 'suppression': 'Suppression comments are forbidden. Remove the comment and fix the underlying diagnostic.' },
    'schema': [],
    'type': 'problem'
  }
};
