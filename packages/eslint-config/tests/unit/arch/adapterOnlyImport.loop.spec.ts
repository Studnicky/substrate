import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { adapterOnlyImport } from '../../../src/rules/arch/adapterOnlyImport.js';
import scenarioGroups from './adapterOnlyImport.scenarios.json';

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

void describe('adapter-only-import', () => {
  void it('validates adapter-only-import scenarios', () => {
    ruleTester.run('adapter-only-import', adapterOnlyImport, scenarioGroups);
  });
});
