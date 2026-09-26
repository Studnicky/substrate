import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { memoizeArrayLength } from '../../../src/rules/v8/memoizeArrayLength.js';
import scenarioGroups from './memoizeArrayLength.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { sourceType: 'module' } }
});

void describe('memoize-array-length', () => {
  void it('validates memoize-array-length scenarios', () => {
    ruleTester.run('memoize-array-length', memoizeArrayLength, scenarioGroups);
  });

  void it('covers remaining guard exits over real source', () => {
    ruleTester.run('memoize-array-length', memoizeArrayLength, {
      'invalid': [],
      'valid': [
        { 'code': 'for (;;) { break; }', 'name': 'a ForStatement with no test - guarded, not crashed' },
        {
          'code': 'declare let i: number; while (i < 10) { i += 1; }',
          'name': 'a WhileStatement whose test is an unrelated comparison - not tracked'
        },
        {
          'code': 'declare let len: number; declare const arr: readonly unknown[]; for (let i = 0; i < 10; i += 1) { len += arr.length; }',
          'name': 'an AssignmentExpression that is not a plain `=` reassignment'
        },
        {
          'code': 'declare let len: number; declare const arr: readonly unknown[]; len = arr.length;',
          'name': 'an AssignmentExpression not enclosed by any loop - not tracked (no crash walking to Program)'
        }
      ]
    });
  });
});
