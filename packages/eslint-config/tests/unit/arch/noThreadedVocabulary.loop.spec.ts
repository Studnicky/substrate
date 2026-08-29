import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noThreadedVocabulary } from '../../../src/rules/arch/noThreadedVocabulary.js';
import scenarioGroups from './noThreadedVocabulary.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    }
  }
});

void describe('no-threaded-vocabulary', () => {
  void it('validates no-threaded-vocabulary scenarios', () => {
    ruleTester.run('no-threaded-vocabulary', noThreadedVocabulary, scenarioGroups);
  });
});
