import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { deleteProperty } from '../../../src/rules/v8/deleteProperty.js';
import scenarioGroups from './deleteProperty.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { sourceType: 'module' } }
});

void describe('delete-property', () => {
  void it('validates delete-property scenarios', () => {
    ruleTester.run('delete-property', deleteProperty, scenarioGroups);
  });
});
