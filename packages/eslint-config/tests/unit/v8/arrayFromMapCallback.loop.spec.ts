import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { arrayFromMapCallback } from '../../../src/rules/v8/arrayFromMapCallback.js';
import scenarioGroups from './arrayFromMapCallback.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: { parser, parserOptions: { sourceType: 'module' } }
});

void describe('array-from-map-callback', () => {
  void it('validates array-from-map-callback scenarios', () => {
    ruleTester.run('array-from-map-callback', arrayFromMapCallback, scenarioGroups);
  });
});
