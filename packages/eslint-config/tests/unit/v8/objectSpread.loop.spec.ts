import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'node:test';

import { objectSpread } from '../../../src/rules/v8/objectSpread.js';
import scenarioGroups from './objectSpread.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': { 'parser': parser, 'parserOptions': { 'sourceType': 'module' } }
});

void describe('object-spread', () => {
  void it('validates object-spread scenarios', () => {
    ruleTester.run('object-spread', objectSpread, scenarioGroups);
  });
});
