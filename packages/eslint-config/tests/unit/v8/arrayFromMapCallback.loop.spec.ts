import { describe, it } from 'node:test';
import { resolve } from 'node:path';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { arrayFromMapCallback } from '../../../src/rules/v8/arrayFromMapCallback.js';
import scenarioGroups from './arrayFromMapCallback.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../..');

// `projectService`/`tsconfigRootDir`: the rule now resolves `Array.from` via
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

void describe('array-from-map-callback', () => {
  void it('validates array-from-map-callback scenarios', () => {
    ruleTester.run('array-from-map-callback', arrayFromMapCallback, scenarioGroups);
  });
});
