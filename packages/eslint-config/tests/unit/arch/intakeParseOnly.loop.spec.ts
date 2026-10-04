import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { intakeParseOnly } from '../../../src/rules/arch/intakeParseOnly.js';
import scenarioGroups from './intakeParseOnly.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repositoryRoot = resolve(import.meta.dirname, '../../../..');

// The rule resolves parameter TYPES through the TypeScript checker rather than matching
// annotation syntax, so the tester must supply a real program — without one the rule
// correctly degrades to silence and every invalid scenario would pass vacuously.
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

void describe('intake-parse-only', () => {
  void it('validates intake-parse-only scenarios', () => {
    ruleTester.run('intake-parse-only', intakeParseOnly, scenarioGroups);
  });
});
