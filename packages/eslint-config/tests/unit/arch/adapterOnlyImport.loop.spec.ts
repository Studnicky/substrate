import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'node:test';

import { adapterOnlyImport } from '../../../src/rules/arch/adapterOnlyImport.js';
import scenarioGroups from './adapterOnlyImport.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'ecmaVersion': 2022,
      'sourceType': 'module'
    }
  }
});

void describe('adapter-only-import', () => {
  void it('validates adapter-only-import scenarios', () => {
    ruleTester.run('adapter-only-import', adapterOnlyImport, scenarioGroups);
  });
});
