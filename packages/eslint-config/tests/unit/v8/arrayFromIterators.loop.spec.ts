import { describe, it } from 'node:test';
import { resolve } from 'node:path';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { arrayFromIterators } from '../../../src/rules/v8/arrayFromIterators.js';
import scenarioGroups from './arrayFromIterators.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../..');

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts']
      },
      tsconfigRootDir: repoRoot
    }
  }
});

void describe('array-from-iterators', () => {
  void it('validates array-from-iterators scenarios (A8: retargeted from Array.from() to the manual for-of + push drain it was actually reaching for)', () => {
    ruleTester.run('array-from-iterators', arrayFromIterators, scenarioGroups);
  });
});
