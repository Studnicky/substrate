import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { chainedArrayIteration } from '../../../src/rules/v8/chainedArrayIteration.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': { 'parser': parser, 'parserOptions': { 'sourceType': 'module' } }
});

ruleTester.run('chained-array-iteration', chainedArrayIteration, {
  'valid': [
    {
      'code': 'const names = users.map((u) => u.name);',
      'name': 'standalone map() — not flagged'
    },
    {
      'code': 'const active = users.filter((u) => u.active);',
      'name': 'standalone filter() — not flagged'
    }
  ],
  'invalid': [
    {
      'code': 'const names = users.filter((u) => u.active).map((u) => u.name);',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'filter().map() chain — flagged'
    },
    {
      'code': 'const doubled = values.map((v) => v * 2).filter((v) => v > 0);',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'map().filter() chain — flagged'
    }
  ]
});
