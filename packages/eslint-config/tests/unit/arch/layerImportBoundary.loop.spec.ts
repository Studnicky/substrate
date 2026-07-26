import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { layerImportBoundary } from '../../../src/rules/arch/layerImportBoundary.js';
import scenarioGroups from './layerImportBoundary.scenarios.json' with { type: 'json' };

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

void describe('layer-import-boundary', () => {
  void it('validates layer-import-boundary scenarios', () => {
    ruleTester.run('layer-import-boundary', layerImportBoundary, scenarioGroups);
  });
});
