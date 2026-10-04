import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { staticMethodVerbs } from '../../src/rules/staticMethodVerbs.js';
import scenarioGroups from './staticMethodVerbs.scenarios.json' with { 'type': 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repositoryRoot = resolve(import.meta.dirname, '../../../..');

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'ecmaVersion': 2022,
      'sourceType': 'module'
    }
  }
});

const typedRuleTester = new RuleTester({
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

class StaticMethodVerbsRunners {
  public static declareRuns(): void {
    for (let index = 0; index < scenarioGroups.runs.length; index += 1) {
      StaticMethodVerbsRunners.declareRun(scenarioGroups.runs[index]!);
    }
  }

  private static declareRun(run: (typeof scenarioGroups.runs)[number]): void {
    void it(run.name, () => {
      const tester = run.shape === 'typed' ? typedRuleTester : ruleTester;

      tester.run(run.ruleName, staticMethodVerbs, {
        'invalid': run.invalid,
        'valid': run.valid
      });
    });
  }
}

void describe('static-method-verbs', () => {
  StaticMethodVerbsRunners.declareRuns();
});
