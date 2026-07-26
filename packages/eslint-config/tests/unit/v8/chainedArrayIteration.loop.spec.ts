import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { chainedArrayIteration } from '../../../src/rules/v8/chainedArrayIteration.js';
import scenarioGroups from './chainedArrayIteration.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { sourceType: 'module' } }
});

void describe('chained-array-iteration', () => {
  void it('validates chained-array-iteration scenarios', () => {
    ruleTester.run('chained-array-iteration', chainedArrayIteration, scenarioGroups);
  });
});
