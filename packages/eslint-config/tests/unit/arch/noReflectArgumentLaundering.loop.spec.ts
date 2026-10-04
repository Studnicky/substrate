import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { noReflectArgumentLaundering } from '../../../src/rules/arch/noReflectArgumentLaundering.js';
import scenarioGroups from './noReflectArgumentLaundering.scenarios.json' with { 'type': 'json' };

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

void describe('no-reflect-argument-laundering', () => {
  void it('validates no-reflect-argument-laundering scenarios', () => {
    ruleTester.run('no-reflect-argument-laundering', noReflectArgumentLaundering, scenarioGroups);
  });
});
