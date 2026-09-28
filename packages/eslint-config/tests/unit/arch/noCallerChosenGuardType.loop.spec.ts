import { describe, it } from 'node:test';
import { resolve } from 'node:path';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noCallerChosenGuardType } from '../../../src/rules/arch/noCallerChosenGuardType.js';
import scenarioGroups from './noCallerChosenGuardType.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../..');

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts', 'eslint-config/src/*.ts']
      },
      tsconfigRootDir: repoRoot
    }
  }
});

void describe('no-caller-chosen-guard-type', () => {
  void it('validates no-caller-chosen-guard-type scenarios', () => {
    ruleTester.run('no-caller-chosen-guard-type', noCallerChosenGuardType, scenarioGroups);
  });
});
