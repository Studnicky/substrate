import { describe, it } from 'node:test';
import { resolve } from 'node:path';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { chainedArrayIteration } from '../../../src/rules/v8/chainedArrayIteration.js';
import scenarioGroups from './chainedArrayIteration.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../..');

// `projectService`/`tsconfigRootDir`: the rule now resolves each chain link via
// `CallIdentity`/`checker.getResolvedSignature`, which needs type services.
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

void describe('chained-array-iteration', () => {
  void it('validates chained-array-iteration scenarios', () => {
    ruleTester.run('chained-array-iteration', chainedArrayIteration, scenarioGroups);
  });
});
