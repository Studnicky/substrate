import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { inlineTrivialLogic } from '../../src/rules/inlineTrivialLogic.js';
import scenarioGroups from './inlineTrivialLogic.scenarios.json';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    }
  }
});

void describe('inline-trivial-logic', () => {
  void it('validates inline trivial logic', () => {
    ruleTester.run('inline-trivial-logic', inlineTrivialLogic, scenarioGroups);
  });
});
