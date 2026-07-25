import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { requireOptionsObject } from '../../src/rules/requireOptionsObject.js';
import scenarioGroups from './requireOptionsObject.scenarios.json';

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

void describe('require-options-object', () => {
  void it('validates require-options-object scenarios', () => {
    ruleTester.run('require-options-object', requireOptionsObject, scenarioGroups);
  });
});
