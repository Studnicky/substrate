import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'node:test';

import { arraySpreadOutsideLoops } from '../../../src/rules/v8/arraySpreadOutsideLoops.js';
import scenarioGroups from './arraySpreadOutsideLoops.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': { 'parser': parser, 'parserOptions': { 'sourceType': 'module' } }
});

void describe('array-spread-outside-loops', () => {
  void it('validates array-spread-outside-loops scenarios', () => {
    ruleTester.run('array-spread-outside-loops', arraySpreadOutsideLoops, scenarioGroups);
  });
});
