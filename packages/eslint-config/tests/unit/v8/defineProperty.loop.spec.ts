import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'node:test';

import { defineProperty } from '../../../src/rules/v8/defineProperty.js';
import scenarioGroups from './defineProperty.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': { 'parser': parser, 'parserOptions': { 'sourceType': 'module' } }
});

void describe('define-property', () => {
  void it('validates define-property scenarios', () => {
    ruleTester.run('define-property', defineProperty, scenarioGroups);
  });
});
