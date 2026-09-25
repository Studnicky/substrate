import { describe, it } from 'node:test';
import { resolve } from 'node:path';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noDoubleAssertion } from '../../../src/rules/arch/noDoubleAssertion.js';
import scenarioGroups from './noDoubleAssertion.scenarios.json' with { type: 'json' };

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

void describe('no-double-assertion', () => {
  void it('validates no-double-assertion scenarios', () => {
    ruleTester.run('no-double-assertion', noDoubleAssertion, scenarioGroups);
  });
});
