import parser from '@typescript-eslint/parser';
import { RuleTester } from 'eslint';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { exportShape } from '../../src/rules/exportShape.js';
import scenarioGroups from './exportShape.scenarios.json' with { 'type': 'json' };

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

const typeAwareRuleTester = new RuleTester({
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

class ExportShapeRunner {
  static runScenario(run: (typeof scenarioGroups.runs)[number]): void {
    const tester = run.shape === 'type-aware' ? typeAwareRuleTester : ruleTester;
    tester.run(run.ruleName, exportShape, {
      'invalid': run.invalid,
      'valid': run.valid
    });
  }
}

void describe('export-shape', () => {
  for (let index = 0; index < scenarioGroups.runs.length; index += 1) {
    const run = scenarioGroups.runs[index];
    if (run !== undefined) {
      void it(run.name, () => { ExportShapeRunner.runScenario(run); });
    }
  }
});
