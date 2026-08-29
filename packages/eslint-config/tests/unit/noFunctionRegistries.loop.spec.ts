import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noFunctionRegistries } from '../../src/rules/noFunctionRegistries.js';
import scenarioGroups from './noFunctionRegistries.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'ecmaVersion': 2022,
      'sourceType': 'module'
    }
  }
});

void describe('no-function-registries', () => {
  for (let index = 0; index < scenarioGroups.runs.length; index += 1) {
    const run = scenarioGroups.runs[index];
    if (run === undefined) {
      continue;
    }
    void it(run.name, () => {
      ruleTester.run(run.ruleName, noFunctionRegistries, {
        'invalid': run.invalid,
        'valid': run.valid
      });
    });
  }
});
