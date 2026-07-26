import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { staticMethodVerbs } from '../../src/rules/staticMethodVerbs.js';
import scenarioGroups from './staticMethodVerbs.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../..');

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    }
  }
});

const typedRuleTester = new RuleTester({
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

void describe('static-method-verbs', () => {
  for (const run of scenarioGroups.runs) {
    void it(run.name, () => {
      const tester = run.shape === 'typed' ? typedRuleTester : ruleTester;
      tester.run(run.ruleName, staticMethodVerbs, {
        invalid: run.invalid,
        valid: run.valid
      });
    });
  }
});
