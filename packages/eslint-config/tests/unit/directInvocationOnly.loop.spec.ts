import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { directInvocationOnly } from '../../src/rules/directInvocationOnly.js';
import scenarioGroups from './directInvocationOnly.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repositoryRoot = resolve(import.meta.dirname, '../../../..');

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

void describe('direct-invocation-only', () => {
  void it('validates direct invocation only', () => {
    ruleTester.run('direct-invocation-only', directInvocationOnly, scenarioGroups);
  });
});
