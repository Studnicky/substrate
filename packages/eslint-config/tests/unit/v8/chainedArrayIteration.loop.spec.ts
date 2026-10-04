import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { chainedArrayIteration } from '../../../src/rules/v8/chainedArrayIteration.js';
import scenarioGroups from './chainedArrayIteration.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repositoryRoot = resolve(import.meta.dirname, '../../../..');

// `projectService`/`tsconfigRootDir`: the rule now resolves each chain link via
// `CallIdentity`/`checker.getResolvedSignature`, which needs type services.
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

void describe('chained-array-iteration', () => {
  void it('validates chained-array-iteration scenarios', () => {
    ruleTester.run('chained-array-iteration', chainedArrayIteration, scenarioGroups);
  });
});
