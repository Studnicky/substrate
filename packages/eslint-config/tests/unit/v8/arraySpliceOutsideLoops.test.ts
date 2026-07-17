import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { arraySpliceOutsideLoops } from '../../../src/rules/v8/arraySpliceOutsideLoops.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': { 'parser': parser, 'parserOptions': { 'sourceType': 'module' } }
});

ruleTester.run('array-splice-outside-loops', arraySpliceOutsideLoops, {
  'valid': [
    {
      'code': 'items.splice(0, 1);',
      'name': 'splice() outside any loop — not flagged'
    }
  ],
  'invalid': [
    {
      'code': 'for (let i = items.length - 1; i >= 0; i--) { items.splice(i, 1); }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'splice() inside for loop — flagged'
    },
    {
      'code': 'for (const id of ids) { records.splice(0, 1); }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'splice() inside for...of loop — flagged'
    },
    {
      'code': 'while (items.length > 0) { items.splice(0, 1); }',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'splice() inside while loop — flagged'
    }
  ]
});
