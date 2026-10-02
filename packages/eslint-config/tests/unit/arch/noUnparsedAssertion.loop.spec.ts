import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { noUnparsedAssertion } from '../../../src/rules/arch/noUnparsedAssertion.js';
import scenarioGroups from './noUnparsedAssertion.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repositoryRoot = resolve(import.meta.dirname, '../../../..');

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'projectService': {
        'allowDefaultProject': ['*.ts', 'eslint-config/src/*.ts']
      },
      'tsconfigRootDir': repositoryRoot
    }
  }
});

void describe('no-unparsed-assertion', () => {
  void it('validates no-unparsed-assertion scenarios', () => {
    ruleTester.run('no-unparsed-assertion', noUnparsedAssertion, scenarioGroups);
  });
});
