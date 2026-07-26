import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { interfaceMustBeContract } from '../../src/rules/interfaceMustBeContract.js';
import scenarioGroups from './interfaceMustBeContract.scenarios.json' with { type: 'json' };

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
    ruleTester.run('interface-must-be-contract', interfaceMustBeContract, scenarioGroups);
  });
});
