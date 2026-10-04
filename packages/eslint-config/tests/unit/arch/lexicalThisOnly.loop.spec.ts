import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'node:test';

import { lexicalThisOnly } from '../../../src/rules/arch/lexicalThisOnly.js';
import scenarioGroups from './lexicalThisOnly.scenarios.json' with { 'type': 'json' };

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

void describe('lexical-this-only', () => {
  void it('validates lexical-this-only scenarios', () => {
    ruleTester.run('lexical-this-only', lexicalThisOnly, scenarioGroups);
  });
});
