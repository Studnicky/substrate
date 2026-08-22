import { describe, it } from 'node:test';
import { resolve } from 'node:path';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { arraySpliceOutsideLoops } from '../../../src/rules/v8/arraySpliceOutsideLoops.js';
import scenarioGroups from './arraySpliceOutsideLoops.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../..');

// `projectService`/`tsconfigRootDir` (not a bare `sourceType: 'module'`) is required:
// the rule now resolves call identity via `CallIdentity`/`checker.getResolvedSignature`,
// which needs type services to resolve anything at all.
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

void describe('array-splice-outside-loops', () => {
  void it('validates array-splice-outside-loops scenarios', () => {
    ruleTester.run('array-splice-outside-loops', arraySpliceOutsideLoops, scenarioGroups);
  });

  void it('A14: splice() inside a deferred (non-per-iteration) callback defined inside a loop is not flagged', () => {
    ruleTester.run('array-splice-outside-loops', arraySpliceOutsideLoops, {
      'invalid': [],
      'valid': [
        {
          'code': 'declare const ids: readonly number[]; declare function fetchThen(cb: (data: number[]) => void): void; for (const id of ids) { fetchThen((data) => { data.splice(0, 1); }); }',
          'name': 'splice() inside a callback that runs once per network response, not once per loop iteration - not flagged (bare descendant selector used to over-fire here)'
        }
      ]
    });
  });

  void it('B2: splice() inside a .forEach() callback is flagged (LoopContext treats the callback as a loop body)', () => {
    ruleTester.run('array-splice-outside-loops', arraySpliceOutsideLoops, {
      'invalid': [
        {
          'code': 'declare const batches: number[][]; batches.forEach((batch) => { batch.splice(0, 1); });',
          'errors': [{ 'messageId': 'forbidden' }],
          'name': 'splice() inside a .forEach() callback - flagged'
        }
      ],
      'valid': []
    });
  });
});
