import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { exportShape } from '../../src/rules/exportShape.js';
import scenarioGroups from './exportShape.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../..');

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    }
  }
});

const typeAwareRuleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts']
      },
      tsconfigRootDir: repoRoot
    }
  }
});

void describe('export-shape', () => {
  for (const run of scenarioGroups.runs) {
    void it(run.name, () => {
      const tester = run.shape === 'type-aware' ? typeAwareRuleTester : ruleTester;
      tester.run(run.ruleName, exportShape, {
        invalid: run.invalid,
        valid: run.valid
      });
    });
  }
});
