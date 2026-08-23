import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { intakeParseOnly } from '../../../src/rules/arch/intakeParseOnly.js';
import scenarioGroups from './intakeParseOnly.scenarios.json' with { type: 'json' };

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

void describe('intake-parse-only', () => {
  void it('validates intake-parse-only scenarios', () => {
    ruleTester.run('intake-parse-only', intakeParseOnly, scenarioGroups);
  });
});
