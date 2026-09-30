import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { describe, it } from 'node:test';

import { inlineTrivialLogic } from '../../src/rules/inlineTrivialLogic.js';
import scenarioGroups from './inlineTrivialLogic.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'projectService': {
        'allowDefaultProject': ['*.ts']
      },
      'tsconfigRootDir': import.meta.dirname
    }
  }
});

void describe('inline-trivial-logic', () => {
  void it('validates inline trivial logic', () => {
    ruleTester.run('inline-trivial-logic', inlineTrivialLogic, scenarioGroups);
  });
});
