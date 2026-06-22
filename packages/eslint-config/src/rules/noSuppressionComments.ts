import type { Rule } from 'eslint';

const SUPPRESSION_TOKENS = [
  '@ts-expect-error',
  '@ts-ignore',
  '@ts-nocheck',
  'eslint-disable-next-line',
  'eslint-disable-line',
  'eslint-disable',
  'eslint-enable',
  'tslint:disable-next-line',
  'tslint:disable-line',
  'tslint:disable'
];

const hasSuppression = (text: string): boolean => {
  const result = SUPPRESSION_TOKENS.some((token) => {
    const result = text.includes(token);
    return result;
  });
  return result;
};

const createNoSuppressionComments: NonNullable<Rule.RuleModule['create']> = (context) => {
  const onProgram: NonNullable<Rule.RuleListener['Program']> = () => {
    const { sourceCode } = context;
    const text = sourceCode.getText();
    const comments = sourceCode.getAllComments();
    const commentsLength = comments.length;

    for (let index = 0; index < commentsLength; index += 1) {
      const comment = comments[index];

      if (comment === undefined) {
        continue;
      }
      if (!hasSuppression(comment.value)) {
        continue;
      }
      const range: unknown = comment.range;
      let start: number | undefined = undefined;
      let end: number | undefined = undefined;

      if (Array.isArray(range) && range.length === 2) {
        const first: unknown = range[0];
        const second: unknown = range[1];

        if (typeof first === 'number' && typeof second === 'number') {
          start = first;
          end = second;
        }
      }

      const fix = start === undefined || end === undefined
        ? undefined
        : (fixer: Rule.RuleFixer) => {
          const lineStart = start;
          const lineEnd = end;
          const codeLineStart = text.lastIndexOf('\n', lineStart - 1) + 1;
          const lineEndRaw = text.indexOf('\n', lineEnd);
          const codeLineEnd = lineEndRaw === -1 ? text.length : lineEndRaw;
          const before = text.slice(codeLineStart, lineStart);
          const after = text.slice(lineEnd, codeLineEnd);
          const beforeIsWhitespace = before.trim().length === 0;
          const afterIsWhitespace = after.trim().length === 0;

          if (beforeIsWhitespace && afterIsWhitespace) {
            const endWithNewline = lineEndRaw === -1 ? codeLineEnd : codeLineEnd + 1;

            return fixer.removeRange([codeLineStart, endWithNewline]);
          }

          return fixer.removeRange([lineStart, codeLineEnd]);
        };

      if (comment.loc) {
        context.report({
          'fix': fix,
          'loc': comment.loc,
          'messageId': 'suppression'
        });
      } else {
        context.report({
          'fix': fix,
          'messageId': 'suppression',
          'node': sourceCode.ast
        });
      }
    }
  };

  return { 'Program': onProgram };
};

export const noSuppressionComments: Rule.RuleModule = {
  'create': createNoSuppressionComments,
  'meta': {
    'docs': { 'description': 'Disallow lint and type suppression comments.' },
    'fixable': 'code',
    'messages': { 'suppression': 'Suppression comments are forbidden.' },
    'schema': [],
    'type': 'problem'
  }
};
