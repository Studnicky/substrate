import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noNativeError } from '../../src/rules/noNativeError.js';
import scenarioGroups from './noNativeError.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../..');

// The abort-reason check resolves the receiver's type through the checker, so the
// scenarios run under typed linting.
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ['packages/eslint-config/*.ts'],
        maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 60
      },
      tsconfigRootDir: repoRoot
    }
  }
});

void describe('no-native-error', () => {
  void it('validates no-native-error scenarios', () => {
    ruleTester.run('no-native-error', noNativeError, scenarioGroups);
  });
});
