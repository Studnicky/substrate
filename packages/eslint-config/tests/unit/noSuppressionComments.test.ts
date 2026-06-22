import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noSuppressionComments } from '../../src/rules/noSuppressionComments.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    }
  }
});

ruleTester.run('no-suppression-comments', noSuppressionComments, {
  valid: [
    // Normal code — no suppression tokens
    { code: `const x = 1;` },
    // Regular comment without any suppression token
    { code: `// This is a normal comment\nconst x = 1;` },
    // Block comment without suppression tokens
    { code: `/* This is a block comment */\nconst x = 1;` },
    // JSDoc comment (no suppression)
    { code: `/** @param x - the value */\nfunction fn(x: number) { return x + 1; }` },
    // ESLint directive comments that are swallowed by ESLint's own directive processing
    // before getAllComments() is called — the rule cannot intercept them
    { code: `const x = 1; // eslint-disable-line` },
    { code: `/* eslint-disable */\nconst x = 1;` }
  ],
  invalid: [
    // case: standalone block-level suppression on its own line
    // when it appears at start of line; autofix removes the whole line
    {
      code: `// eslint-disable\nconst x = 1;`,
      errors: [{ messageId: 'suppression' }],
      output: `const x = 1;`
    },
    // case: autofix removes a next-line suppression
    {
      code: `// eslint-disable-next-line no-console\nconsole.log('hi');`,
      errors: [{ messageId: 'suppression' }],
      output: `console.log('hi');`
    },
    // case: autofix removes a TS ignore suppression
    {
      code: `// @ts-ignore\nconst x: number = 'oops';`,
      errors: [{ messageId: 'suppression' }],
      output: `const x: number = 'oops';`
    },
    // case: autofix removes a TS expect-error suppression
    {
      code: `// @ts-expect-error\nconst x: number = 'oops';`,
      errors: [{ messageId: 'suppression' }],
      output: `const x: number = 'oops';`
    },
    // case: autofix removes a TS nocheck suppression
    {
      code: `// @ts-nocheck\nconst x = 1;`,
      errors: [{ messageId: 'suppression' }],
      output: `const x = 1;`
    },
    // tslint:disable — autofix removes the comment line
    {
      code: `// tslint:disable\nconst x = 1;`,
      errors: [{ messageId: 'suppression' }],
      output: `const x = 1;`
    },
    // tslint:disable-next-line — autofix removes the comment line
    {
      code: `// tslint:disable-next-line\nconst x = 1;`,
      errors: [{ messageId: 'suppression' }],
      output: `const x = 1;`
    },
    // eslint-enable — autofix removes the comment line
    {
      code: `// eslint-enable no-console\nconst x = 1;`,
      errors: [{ messageId: 'suppression' }],
      output: `const x = 1;`
    }
  ]
});
