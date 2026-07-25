import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { directInvocationOnly } from '../../src/rules/directInvocationOnly.js';
import scenarioGroups from './directInvocationOnly.scenarios.json';

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

void describe('direct-invocation-only', () => {
  void it('validates direct invocation only', () => {
    ruleTester.run('direct-invocation-only', directInvocationOnly, scenarioGroups);
  });
});
