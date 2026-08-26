import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { knownTypesOutsideAdapters } from '../../../src/rules/arch/knownTypesOutsideAdapters.js';
import scenarioGroups from './knownTypesOutsideAdapters.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ['scripts/*.ts', 'src/*/*.ts', 'src/*/*/*.ts']
      },
      tsconfigRootDir: import.meta.dirname
    }
  }
});

void describe('known-types-outside-adapters', () => {
  void it('validates known-types-outside-adapters scenarios', () => {
    ruleTester.run('known-types-outside-adapters', knownTypesOutsideAdapters, scenarioGroups);
  });
});
