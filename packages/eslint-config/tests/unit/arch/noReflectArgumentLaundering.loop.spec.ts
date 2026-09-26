import { describe, it } from 'node:test';
import { resolve } from 'node:path';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noReflectArgumentLaundering } from '../../../src/rules/arch/noReflectArgumentLaundering.js';
import scenarioGroups from './noReflectArgumentLaundering.scenarios.json' with { type: 'json' };

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

void describe('no-reflect-argument-laundering', () => {
  void it('validates no-reflect-argument-laundering scenarios', () => {
    ruleTester.run('no-reflect-argument-laundering', noReflectArgumentLaundering, scenarioGroups);
  });
});
