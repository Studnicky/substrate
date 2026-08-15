import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { dynamicPropertyAccess } from '../../../src/rules/v8/dynamicPropertyAccess.js';
import scenarioGroups from './dynamicPropertyAccess.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { sourceType: 'module' } }
});

void describe('dynamic-property-access', () => {
  void it('validates dynamic-property-access scenarios', () => {
    ruleTester.run('dynamic-property-access', dynamicPropertyAccess, scenarioGroups);
  });
});
