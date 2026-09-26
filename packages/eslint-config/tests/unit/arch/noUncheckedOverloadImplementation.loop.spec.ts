import { describe, it } from 'node:test';
import { resolve } from 'node:path';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noUncheckedOverloadImplementation } from '../../../src/rules/arch/noUncheckedOverloadImplementation.js';
import scenarioGroups from './noUncheckedOverloadImplementation.scenarios.json' with { type: 'json' };

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

void describe('no-unchecked-overload-implementation', () => {
  void it('validates no-unchecked-overload-implementation scenarios', () => {
    ruleTester.run('no-unchecked-overload-implementation', noUncheckedOverloadImplementation, scenarioGroups);
  });
});
