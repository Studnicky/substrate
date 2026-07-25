import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { tryCatchInLoops } from '../../../src/rules/v8/tryCatchInLoops.js';
import scenarioGroups from './tryCatchInLoops.scenarios.json';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { sourceType: 'module' } }
});

void describe('try-catch-in-loops', () => {
  void it('validates try-catch-in-loops scenarios', () => {
    ruleTester.run('try-catch-in-loops', tryCatchInLoops, scenarioGroups);
  });
});
