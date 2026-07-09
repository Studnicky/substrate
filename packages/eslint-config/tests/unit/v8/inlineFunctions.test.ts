import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { inlineFunctions } from '../../../src/rules/v8/inlineFunctions.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': { 'parser': parser, 'parserOptions': { 'sourceType': 'module' } }
});

ruleTester.run('inline-functions', inlineFunctions, {
  'valid': [
    {
      'code': 'const map = { a: function () { return 1; } };',
      'name': 'module-scope const map with inline function value — pre-built, not rebuilt per call'
    },
    {
      'code': 'class X { static map = { a: function () { return 1; } }; }',
      'name': 'static class field map with inline function value — pre-built, not flagged'
    },
    {
      'code': 'const map = { transform: function () { return 1; } };',
      'name': 'exempt key name "transform" — not flagged regardless of scope'
    },
    {
      'code': 'const map = { a: someNamedFunction };',
      'name': 'named function reference (not an inline FunctionExpression) — not flagged'
    }
  ],
  'invalid': [
    {
      'code': 'function build() { return { a: function () { return 1; } }; }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'map rebuilt inside a function body on every call — flagged'
    },
    {
      'code': 'class X { m() { const map = { a: function () { return 1; } }; return map; } }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'map rebuilt inside a method body — flagged'
    },
    {
      'code': 'class X { field = { a: function () { return 1; } }; }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'non-static instance field rebuilds per instantiation — flagged'
    }
  ]
});
