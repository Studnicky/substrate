import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noMixedCallableShapes } from '../../src/rules/noMixedCallableShapes.js';
import scenarioGroups from './noMixedCallableShapes.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts'],
        maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 30
      },
      tsconfigRootDir: import.meta.dirname
    }
  }
});

void describe('no-mixed-callable-shapes', () => {
  void it('validates no-mixed-callable-shapes scenarios', () => {
    ruleTester.run('no-mixed-callable-shapes', noMixedCallableShapes, scenarioGroups);
  });
});
