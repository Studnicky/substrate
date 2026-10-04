import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { arrayFromIterators } from '../../../src/rules/v8/arrayFromIterators.js';
import scenarioGroups from './arrayFromIterators.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repositoryRoot = resolve(import.meta.dirname, '../../../..');

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'projectService': {
        'allowDefaultProject': ['*.ts']
      },
      'tsconfigRootDir': repositoryRoot
    }
  }
});

void describe('array-from-iterators', () => {
  void it('validates array-from-iterators scenarios (A8: retargeted from Array.from() to the manual for-of + push drain it was actually reaching for)', () => {
    ruleTester.run('array-from-iterators', arrayFromIterators, scenarioGroups);
  });
});
