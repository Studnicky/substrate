import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'node:test';

import { computedClassProperties } from '../../../src/rules/v8/computedClassProperties.js';
import scenarioGroups from './computedClassProperties.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': { 'parser': parser, 'parserOptions': { 'sourceType': 'module' } }
});

void describe('computed-class-properties', () => {
  void it('validates computed-class-properties scenarios', () => {
    ruleTester.run('computed-class-properties', computedClassProperties, scenarioGroups);
  });
});
