import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { preferCollectionTypes } from '../../src/rules/preferCollectionTypes.js';
import scenarioGroups from './preferCollectionTypes.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    }
  }
});

void describe('prefer-collection-types', () => {
  void it('validates prefer-collection-types scenarios', () => {
    ruleTester.run('prefer-collection-types', preferCollectionTypes, scenarioGroups);
  });
});
