import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { explicitReturnBinding } from '../../src/rules/explicitReturnBinding.js';
import scenarioGroups from './explicitReturnBinding.scenarios.json' with { type: 'json' };

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

void describe('explicit-return-binding', () => {
  void it('validates explicit return binding', () => {
    ruleTester.run('explicit-return-binding', explicitReturnBinding, scenarioGroups);
  });
});
