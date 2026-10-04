import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'node:test';

import { domainPurity } from '../../../src/rules/arch/domainPurity.js';
import scenarioGroups from './domainPurity.scenarios.json' with { 'type': 'json' };

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

void describe('domain-purity', () => {
  void it('validates domain-purity scenarios', () => {
    ruleTester.run('domain-purity', domainPurity, scenarioGroups);
  });
});
