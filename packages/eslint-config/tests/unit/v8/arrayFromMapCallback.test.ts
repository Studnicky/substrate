import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { arrayFromMapCallback } from '../../../src/rules/v8/arrayFromMapCallback.js';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': { 'parser': parser, 'parserOptions': { 'sourceType': 'module' } }
});

ruleTester.run('array-from-map-callback', arrayFromMapCallback, {
  'valid': [
    {
      'code': 'const a = Array.from(iterable);',
      'name': 'single-argument Array.from (no mapper) — not flagged, measurably cheap'
    },
    {
      'code': 'const a = new Array(n); for (let i = 0; i < n; i++) { a[i] = i * 2; }',
      'name': 'manual index-fill loop — the measured-faster, recommended form'
    }
  ],
  'invalid': [
    {
      'code': 'const a = Array.from({ length: n }, (_, i) => i * 2);',
      'errors': [{ 'messageId': 'forbidden' }],
      'name': 'Array.from with a map callback — flagged (measured ~58x slower than manual fill)'
    }
  ]
});
