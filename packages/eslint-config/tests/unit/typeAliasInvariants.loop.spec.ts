import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { Linter, RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { interfaceMustBeContract } from '../../src/rules/interfaceMustBeContract.js';
import { typeAliasInvariants } from '../../src/rules/typeAliasInvariants.js';
import scenarioGroups from './typeAliasInvariants.scenarios.json';

RuleTester.describe = describe;
RuleTester.it = it;

const repoRoot = resolve(import.meta.dirname, '../../../..');

const languageOptions = {
  parser,
  parserOptions: {
    projectService: {
      allowDefaultProject: ['*.ts', 'packages/eslint-config/*.ts', 'src/entities/*.ts'],
      maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 30
    },
    tsconfigRootDir: repoRoot
  }
};

const ruleTester = new RuleTester({ languageOptions });

void describe('type-alias-invariants', () => {
  void it('validates type-alias-invariants scenarios', () => {
    ruleTester.run('type-alias-invariants', typeAliasInvariants, scenarioGroups.rule);
  });

  void it('exposes no internal rule options or severity controls', () => {
    assert.deepEqual(typeAliasInvariants.meta?.schema, scenarioGroups.metaSchema.expected);
  });

  void it('uses only the outer ESLint severity and enabled state', () => {
    const linter = new Linter();
    const baseConfig = {
      files: ['**/*.ts'],
      languageOptions,
      plugins: { local: { rules: { 'type-alias-invariants': typeAliasInvariants } } }
    };
    const warning = linter.verify(
      scenarioGroups.severity.code,
      [{ ...baseConfig, rules: { 'local/type-alias-invariants': 'warn' } }],
      { filename: scenarioGroups.severity.warningFilename }
    );
    const disabled = linter.verify(
      scenarioGroups.severity.code,
      [{ ...baseConfig, rules: { 'local/type-alias-invariants': 'off' } }],
      { filename: scenarioGroups.severity.disabledFilename }
    );

    assert.deepEqual(
      warning.map((message) => { return message.messageId; }),
      scenarioGroups.severity.expectedMessageIds
    );
    assert.equal(warning.at(0)?.severity, scenarioGroups.severity.expectedWarningSeverity);
    assert.deepEqual(disabled, []);
  });

  void it('combined alias and interface rules emit only the interface owner diagnostic', () => {
    const linter = new Linter();
    const messages = linter.verify(
      scenarioGroups.combined.code,
      [
        {
          files: ['**/*.ts'],
          languageOptions,
          plugins: {
            local: {
              rules: {
                'interface-must-be-contract': interfaceMustBeContract,
                'type-alias-invariants': typeAliasInvariants
              }
            }
          },
          rules: {
            'local/interface-must-be-contract': 'error',
            'local/type-alias-invariants': 'error'
          }
        }
      ],
      { filename: scenarioGroups.combined.filename }
    );

    assert.deepEqual(
      messages.map((message) => { return message.messageId; }),
      scenarioGroups.combined.expectedMessageIds
    );
  });
});
