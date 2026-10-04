import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { noUncheckedOverloadImplementation } from '../../../src/rules/arch/noUncheckedOverloadImplementation.js';
import scenarioGroups from './noUncheckedOverloadImplementation.scenarios.json' with { 'type': 'json' };

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

void describe('no-unchecked-overload-implementation', () => {
  void it('validates no-unchecked-overload-implementation scenarios', () => {
    ruleTester.run('no-unchecked-overload-implementation', noUncheckedOverloadImplementation, scenarioGroups);
  });
});
