import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { noDoubleAssertion } from '../../../src/rules/arch/noDoubleAssertion.js';
import scenarioGroups from './noDoubleAssertion.scenarios.json' with { 'type': 'json' };

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

void describe('no-double-assertion', () => {
  void it('validates no-double-assertion scenarios', () => {
    ruleTester.run('no-double-assertion', noDoubleAssertion, scenarioGroups);
  });
});
