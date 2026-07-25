import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { arraySpliceOutsideLoops } from '../../../src/rules/v8/arraySpliceOutsideLoops.js';
import scenarioGroups from './arraySpliceOutsideLoops.scenarios.json';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { sourceType: 'module' } }
});

void describe('array-splice-outside-loops', () => {
  void it('validates array-splice-outside-loops scenarios', () => {
    ruleTester.run('array-splice-outside-loops', arraySpliceOutsideLoops, scenarioGroups);
  });
});
