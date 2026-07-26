import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { Linter, RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { descriptiveIdentifiers } from '../../src/rules/descriptiveIdentifiers.js';
import scenarioGroups from './descriptiveIdentifiers.scenarios.json' with { type: 'json' };

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

void describe('descriptive-identifiers', () => {
  void it('validates descriptive-identifiers scenarios', () => {
    ruleTester.run('descriptive-identifiers', descriptiveIdentifiers, scenarioGroups.rule);
  });

  void it('does not exhibit polynomial blowup on a long uppercase run followed by a digit', () => {
    const linter = new Linter();
    const name = `${'A'.repeat(scenarioGroups.performance.repeatCount)}1x`;
    const start = Date.now();

    linter.verify(`const ${name} = 1; void ${name};`, {
      languageOptions: { ecmaVersion: 2024, sourceType: 'module' },
      plugins: { local: { rules: { 'descriptive-identifiers': descriptiveIdentifiers } } },
      rules: { 'local/descriptive-identifiers': 'error' }
    });

    const elapsedMs = Date.now() - start;

    assert.ok(
      elapsedMs < scenarioGroups.performance.thresholdMs,
      `expected linting a pathological identifier to stay well under ${scenarioGroups.performance.thresholdMs}ms, took ${elapsedMs}ms`
    );
  });
});
