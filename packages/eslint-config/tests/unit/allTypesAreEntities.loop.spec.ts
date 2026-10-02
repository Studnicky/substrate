import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { allTypesAreEntities } from '../../src/rules/allTypesAreEntities.js';
import scenarioGroups from './allTypesAreEntities.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repositoryRoot = resolve(import.meta.dirname, '../../../..');

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'projectService': {
        'allowDefaultProject': [
          '*.ts',
          'eslint.config.mjs',
          'packages/eslint-config/src/rules/*.ts',
          'packages/eslint-config/tests/fixtures/relocated/eslint.config.mjs',
          'packages/eslint-config/tests/fixtures/relocated/src/entities/*.ts',
          'packages/eslint-config/tests/fixtures/relocated/src/models/*.ts',
          'packages/eslint-config/tests/fixtures/relocated/src/types/*.ts',
          'packages/eslint-config/tests/fixtures/relocated/tests/unit/*.test.ts',
          'packages/retry/eslint.config.mjs',
          'packages/retry/src/entities/*.ts',
          'packages/retry/src/models/*.ts',
          'packages/retry/src/types/*.ts',
          'packages/retry/tests/unit/*.test.ts'
        ],
        'maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING': 30
      },
      'tsconfigRootDir': repositoryRoot
    }
  }
});

void describe('all-types-are-entities', () => {
  void it('validates all-types-are-entities scenarios', () => {
    ruleTester.run('all-types-are-entities', allTypesAreEntities, scenarioGroups);
  });
});
