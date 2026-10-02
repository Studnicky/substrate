import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'node:test';

import { requireOptionsObject } from '../../src/rules/requireOptionsObject.js';
import scenarioGroups from './requireOptionsObject.scenarios.json' with { 'type': 'json' };

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

void describe('require-options-object', () => {
  void it('validates require-options-object scenarios', () => {
    ruleTester.run('require-options-object', requireOptionsObject, scenarioGroups);
  });
});
