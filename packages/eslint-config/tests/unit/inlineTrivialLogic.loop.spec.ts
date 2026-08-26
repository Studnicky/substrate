import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { inlineTrivialLogic } from '../../src/rules/inlineTrivialLogic.js';
import scenarioGroups from './inlineTrivialLogic.scenarios.json' with { type: 'json' };

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

void describe('inline-trivial-logic', () => {
  void it('validates inline trivial logic', () => {
    ruleTester.run('inline-trivial-logic', inlineTrivialLogic, scenarioGroups);
  });
});
