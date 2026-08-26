import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { computedObjectProperties } from '../../../src/rules/v8/computedObjectProperties.js';
import scenarioGroups from './computedObjectProperties.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { sourceType: 'module' } }
});

void describe('computed-object-properties', () => {
  void it('validates computed-object-properties scenarios', () => {
    ruleTester.run('computed-object-properties', computedObjectProperties, scenarioGroups);
  });
});
