import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'node:test';

import { argumentsObject } from '../../../src/rules/v8/argumentsObject.js';
import scenarioGroups from './argumentsObject.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': { 'parser': parser, 'parserOptions': { 'sourceType': 'module' } }
});

void describe('arguments-object', () => {
  void it('validates arguments-object scenarios', () => {
    ruleTester.run('arguments-object', argumentsObject, scenarioGroups);
  });
});
