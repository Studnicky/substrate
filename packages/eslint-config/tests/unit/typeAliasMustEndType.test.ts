import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { typeAliasMustEndType } from '../../src/rules/typeAliasMustEndType.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'ecmaVersion': 2022,
      'sourceType': 'module'
    }
  }
});

ruleTester.run('type-alias-must-end-type', typeAliasMustEndType, {
  'valid': [
    {
      'code': 'export type FooType = { a: number };',
      'name': 'inline export already ends in Type — not flagged'
    },
    {
      'code': 'type Foo = { a: number };',
      'name': 'not exported at all — not flagged'
    }
  ],
  'invalid': [
    {
      'code': 'export type Foo = { a: number };',
      'errors': [{ 'messageId': 'mustEndType' }],
      'name': 'inline export not ending in Type — flagged'
    },
    {
      'code': 'type Foo = { a: number }; export type { Foo };',
      'errors': [{ 'messageId': 'mustEndType' }],
      'name': 'separate re-export form — flagged even though the declaration itself is not exported inline'
    },
    {
      'code': 'type Foo = { a: number }; export { type Foo };',
      'errors': [{ 'messageId': 'mustEndType' }],
      'name': 'separate re-export with specifier-level type keyword — flagged'
    }
  ]
});
