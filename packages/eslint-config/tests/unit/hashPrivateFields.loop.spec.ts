import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { hashPrivateFields } from '../../src/rules/hashPrivateFields.js';
import scenarioGroups from './hashPrivateFields.scenarios.json';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { sourceType: 'module' }
  }
});

void describe('hash-private-fields', () => {
  void it('validates hash-private-fields scenarios', () => {
    ruleTester.run('hash-private-fields', hashPrivateFields, scenarioGroups);
  });
});
