import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { conditionalPropertyAssignment } from '../../../src/rules/v8/conditionalPropertyAssignment.js';
import scenarioGroups from './conditionalPropertyAssignment.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { sourceType: 'module' } }
});

void describe('conditional-property-assignment', () => {
  void it('validates conditional-property-assignment scenarios', () => {
    ruleTester.run('conditional-property-assignment', conditionalPropertyAssignment, scenarioGroups);
  });
});
