import type { Rule } from 'eslint';

import { SUPPRESSION_PATTERN } from './constants/CleanDiagnosticsConstants.js';

// THIS RULE HAS NO AUTOFIXER, DELIBERATELY. DO NOT ADD ONE.
//
// A previous revision shipped one, and it silently DELETED CODE. It removed the
// range from the comment's start to end-of-line, which is only correct for a `//`
// comment (which owns the rest of its line) or a block comment alone on its line.
// For an INLINE block comment, everything after it on that line went with it: a
// coverage-suppressing block comment placed before an exported `const` declaration
// on the same line lost that declaration when `--fix` ran, because the fixer's
// range extended past the end of the comment onto the code that followed it on
// the same line.
//
// Two exported constants were gone. This ran through `pnpm run lint:fix` and
// through the `lint-staged` pre-commit hook, so it could destroy source on any
// commit touching such a file, with no diagnostic.
//
// The obvious repair (remove exactly the comment's own range, nothing past it) is
// still not safe: doing so lets the suppressed diagnostic reappear, so a "fix" can
// turn a green tree red at a location unrelated to the edit, and deleting a
// suppression that was load-bearing for a generated or vendored file changes what
// CI reports rather than what the code means.
//
// Standing policy: an autofixer may exist ONLY for a transformation that cannot
// break the build or change program meaning. Removing a suppression comment is a
// decision about which underlying problem to confront, and that belongs to a
// human. This rule reports; a person fixes.

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
