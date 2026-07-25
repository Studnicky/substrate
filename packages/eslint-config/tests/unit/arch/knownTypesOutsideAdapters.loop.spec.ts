import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { knownTypesOutsideAdapters } from '../../../src/rules/arch/knownTypesOutsideAdapters.js';
import scenarioGroups from './knownTypesOutsideAdapters.scenarios.json';

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

void describe('known-types-outside-adapters', () => {
  void it('validates known-types-outside-adapters scenarios', () => {
    ruleTester.run('known-types-outside-adapters', knownTypesOutsideAdapters, scenarioGroups);
  });
});
