import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { inlineArrowFunctions } from '../../../src/rules/v8/inlineArrowFunctions.js';
import scenarioGroups from './inlineArrowFunctions.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repositoryRoot = resolve(import.meta.dirname, '../../../..');

// `projectService`/`tsconfigRootDir` (not bare `sourceType: 'module'`) is required
// here: the redesigned rule resolves `.forEach` and other per-element iteration
// methods through `CallIdentity` (via the shared `InlineCallablePosition`/
// `LoopContext`), which needs a real type checker. Without type services
// `CallIdentity.isBuiltinCall` always returns `false`, so any scenario relying
// on it would silently pass with zero errors regardless of what the rule
// actually does — a vacuous test.
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

void describe('inline-arrow-functions', () => {
  void it('validates inline-arrow-functions scenarios', () => {
    ruleTester.run('inline-arrow-functions', inlineArrowFunctions, scenarioGroups);
  });

  void it('covers remaining guard exits over real source', () => {
    ruleTester.run('inline-arrow-functions', inlineArrowFunctions, {
      'invalid': [],
      'valid': [
        {
          'code': 'const o = { fn: (x: number) => x };',
          'name': 'a non-BlockStatement (concise) body short-circuits before any position check runs'
        },
        {
          'code': 'const o = { fn: (x: number) => { return x; } };',
          'name': 'a single-statement BlockStatement body short-circuits on the statement-count gate'
        },
        {
          'code': 'class C { method = (x: number): number => { console.log(x); return x; }; }',
          'name': 'a multi-statement BlockStatement body whose container is a class field, not a recognized rebuilt-per-call/iteration position'
        }
      ]
    });
  });
});
