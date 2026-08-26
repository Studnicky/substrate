import { describe, it } from 'node:test';
import { resolve } from 'node:path';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noUnparsedAssertion } from '../../../src/rules/arch/noUnparsedAssertion.js';
import scenarioGroups from './noUnparsedAssertion.scenarios.json' with { type: 'json' };

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

void describe('no-unparsed-assertion', () => {
  void it('validates no-unparsed-assertion scenarios', () => {
    ruleTester.run('no-unparsed-assertion', noUnparsedAssertion, scenarioGroups);
  });
});
