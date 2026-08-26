import { describe, it } from 'node:test';
import { resolve } from 'node:path';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { arrayConcatOutsideLoops } from '../../../src/rules/v8/arrayConcatOutsideLoops.js';
import scenarioGroups from './arrayConcatOutsideLoops.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../..');

// TYPE SERVICES ARE MANDATORY FOR THIS RULE'S TESTS.
//
// `arrayConcatOutsideLoops` identifies its target through
// `CallIdentity.isBuiltinCall`, which resolves the call's signature via the
// TypeScript checker. With a bare `parserOptions: { sourceType: 'module' }` the
// checker is never constructed, `isBuiltinCall` returns false for everything, and
// every `invalid` scenario reports 0 errors where 1 is expected.
//
// Two requirements, both load-bearing:
//   1. `projectService` + `tsconfigRootDir`, so the checker exists at all.
//   2. Scenario code must give the receiver a CONCRETE type — `declare const
//      chunks: number[][]` rather than a bare undeclared identifier. An untyped
//      identifier resolves to `any`, and `getResolvedSignature` cannot attribute an
//      `any` call to `Array.concat` in `lib.es5.d.ts`, so the scenario passes
//      vacuously and proves nothing.
//
// A type-aware rule tested without type services does not fail loudly in every
// direction — `valid` scenarios still pass, for the wrong reason. Keep this config.
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

void describe('array-concat-outside-loops', () => {
  void it('validates array-concat-outside-loops scenarios', () => {
    ruleTester.run('array-concat-outside-loops', arrayConcatOutsideLoops, scenarioGroups);
  });
});
