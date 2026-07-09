import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { inlineArrowFunctions } from '../../../src/rules/v8/inlineArrowFunctions.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': { 'parser': parser, 'parserOptions': { 'sourceType': 'module' } }
});

ruleTester.run('inline-arrow-functions', inlineArrowFunctions, {
  'valid': [
    {
      'code': 'const map = { a: (x) => { let y = x; return y; } };',
      'name': 'module-scope const map with inline multi-statement arrow — pre-built, not flagged'
    },
    {
      'code': 'class X { static map = { a: (x) => { let y = x; return y; } }; }',
      'name': 'static class field map with inline multi-statement arrow — pre-built, not flagged'
    },
    {
      'code': 'const map = { handler: (x) => { let y = x; return y; } };',
      'name': 'exempt key name "handler" — not flagged regardless of scope'
    },
    {
      'code': 'const map = { a: (x) => x + 1 };',
      'name': 'single-expression arrow body (not a BlockStatement) — not flagged'
    }
  ],
  'invalid': [
    {
      'code': 'function build() { return { a: (x) => { let y = x; return y; } }; }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'map rebuilt inside a function body on every call — flagged'
    },
    {
      'code': 'class X { field = { a: (x) => { let y = x; return y; } }; }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'non-static instance field rebuilds per instantiation — flagged'
    }
  ]
});
