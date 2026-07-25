import { describe, it } from 'node:test';
import { resolve } from 'node:path';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { allTypesAreEntities } from '../../src/rules/allTypesAreEntities.js';
import scenarioGroups from './allTypesAreEntities.scenarios.json';

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../..');

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: [
          '*.ts',
          'eslint.config.mjs',
          'packages/eslint-config/src/rules/*.ts',
          'packages/retry/eslint.config.mjs',
          'packages/retry/src/entities/*.ts',
          'packages/retry/src/models/*.ts',
          'packages/retry/src/types/*.ts',
          'packages/retry/tests/unit/*.test.ts'
        ],
        maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 20
      },
      tsconfigRootDir: repoRoot
    }
  }
});

void describe('all-types-are-entities', () => {
  void it('validates all-types-are-entities scenarios', () => {
    ruleTester.run('all-types-are-entities', allTypesAreEntities, scenarioGroups);
  });
});
