import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { interfaceMustBeContract } from '../../src/rules/interfaceMustBeContract.js';
import scenarioGroups from './interfaceMustBeContract.scenarios.json';

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts']
      },
      tsconfigRootDir: import.meta.dirname
    }
  }
});

void describe('interface-must-be-contract', () => {
  void it('validates interface contract classifications', () => {
    ruleTester.run('interface-must-be-contract', interfaceMustBeContract, {
      invalid: [],
      valid: [{
        code: scenarioGroups.cases[0].input.code,
        name: scenarioGroups.cases[0].name
      }]
    });
  });
});
