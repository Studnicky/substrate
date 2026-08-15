import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { arrayConcatOutsideLoops } from '../../../src/rules/v8/arrayConcatOutsideLoops.js';
import scenarioGroups from './arrayConcatOutsideLoops.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { sourceType: 'module' } }
});

void describe('array-concat-outside-loops', () => {
  void it('validates array-concat-outside-loops scenarios', () => {
    ruleTester.run('array-concat-outside-loops', arrayConcatOutsideLoops, scenarioGroups);
  });
});
