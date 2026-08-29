import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noThreadedVocabulary } from '../../../src/rules/arch/noThreadedVocabulary.js';
import scenarioGroups from './noThreadedVocabulary.typed.scenarios.json' with { type: 'json' };

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../../..');

// Typed linting is the rule's supported mode: cross-file enums, generic alias
// instantiations, keyof, indexed access, typeof and import types resolve only
// through the checker. The untyped corpus exercises the degraded fallback.
const ruleTester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ['*.ts', 'packages/eslint-config/*.ts'],
        maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 30
      },
      tsconfigRootDir: repoRoot
    }
  }
});

void describe('no-threaded-vocabulary (typed)', () => {
  void it('validates no-threaded-vocabulary typed scenarios', () => {
    ruleTester.run('no-threaded-vocabulary', noThreadedVocabulary, scenarioGroups);
  });
});
