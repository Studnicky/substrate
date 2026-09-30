import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { prototypeModification } from '../../../src/rules/v8/prototypeModification.js';
import scenarioGroups from './prototypeModification.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repositoryRoot = resolve(import.meta.dirname, '../../../..');

// TYPE SERVICES ARE MANDATORY. This rule identifies `Object.assign`/`Object.setPrototypeOf`
// through `CallIdentity`, which resolves a call's signature via the TypeScript checker, and
// decides "runs again" through `LoopContext`, which resolves iteration-method callbacks the
// same way. Without `projectService` the checker is never built, both resolve nothing, and
// scenarios pass or fail for reasons unrelated to what they are asserting.
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

void describe('prototype-modification', () => {
  void it('validates prototype-modification scenarios', () => {
    ruleTester.run('prototype-modification', prototypeModification, scenarioGroups);
  });
});
