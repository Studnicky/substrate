import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { canonicalExportNames } from '../../src/rules/canonicalExportNames.js';
import scenarioGroups from './canonicalExportNames.scenarios.json' with { type: 'json' };

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

void describe('canonical-export-names', () => {
  void it('validates canonical export names', () => {
    ruleTester.run('canonical-export-names', canonicalExportNames, {
      invalid: scenarioGroups.invalid,
      valid: scenarioGroups.valid
    });
  });
});
