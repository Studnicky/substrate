import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import {
  describe, it
} from 'node:test';

import { Linter } from 'eslint';
import tseslint from 'typescript-eslint';

import { entitySuite } from '../../src/suites/entitySuite.js';

const repoRoot = resolve(import.meta.dirname, '../../../..');

const languageOptions = {
  'parser': tseslint.parser,
  'parserOptions': {
    'projectService': {
      'allowDefaultProject': ['*.ts', 'packages/retry/src/models/*.ts'],
      'maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING': 20
    },
    'tsconfigRootDir': repoRoot
  }
};

void describe('entitySuite', () => {
  void it('keeps entity rules strict and disables the conflicting function-type preference', () => {
    assert.deepEqual(entitySuite.linterOptions, { 'noInlineConfig': true });
    assert.deepEqual(entitySuite.rules, {
      '@studnicky/all-types-are-entities': 'error',
      '@studnicky/folder-content-shape': 'error',
      '@studnicky/interface-must-be-contract': 'error',
      '@studnicky/interface-suffix': 'error',
      '@studnicky/interfaces-compose-named-types': 'error',
      '@studnicky/type-alias-invariants': 'error',
      '@studnicky/whole-canonical-types': 'error',
      '@typescript-eslint/prefer-function-type': 'off'
    });
  });

  void it('does not allow inline comments to disable entity rules', () => {
    const linter = new Linter();
    const messages = linter.verify(
      '/* eslint-disable @studnicky/interface-must-be-contract */ interface PureDataInterface { value: string; }',
      [
        {
          'files': ['**/*.ts'],
          languageOptions,
          'plugins': { '@typescript-eslint': tseslint.plugin }
        },
        entitySuite
      ],
      { 'filename': 'PureDataInterface.ts' }
    );

    assert.equal(
      messages.some((message) => {
        return message.ruleId === '@studnicky/interface-must-be-contract'
          && message.messageId === 'dataShapeMustBeType';
      }),
      true
    );
  });

  void it('overrides an earlier function-type preference for a minimal callable interface', () => {
    const linter = new Linter();
    const messages = linter.verify(
      'export interface CallableInterface { (): Promise<void>; }',
      [
        {
          'files': ['**/*.ts'],
          languageOptions,
          'plugins': { '@typescript-eslint': tseslint.plugin },
          'rules': { '@typescript-eslint/prefer-function-type': 'error' }
        },
        entitySuite
      ],
      { 'filename': 'CallableInterface.ts' }
    );

    assert.deepEqual(messages, []);
  });

  void it('assigns each entity declaration defect to its exact owning rule', () => {
    const scenarios = [
      {
        'code': [
          "import type { ImportedPureDataInterface } from './packages/eslint-config/tests/fixtures/ImportedPureDataInterface.js';",
          'interface ImportedDuplicate { first: string; second: number; }'
        ].join('\n'),
        'expected': [
          {
            'messageId': 'dataShapeMustBeType',
            'ruleId': '@studnicky/interface-must-be-contract'
          }
        ],
        'filename': 'ImportedDuplicate.ts',
        'name': 'imported duplicate pure-data interface'
      },
      {
        'code': 'interface Empty {}',
        'expected': [
          {
            'messageId': 'dataShapeMustBeType',
            'ruleId': '@studnicky/interface-must-be-contract'
          }
        ],
        'filename': 'Empty.ts',
        'name': 'empty interface'
      },
      {
        'code': 'interface Callable { (): void; }',
        'expected': [
          {
            'messageId': 'missing-interface-suffix',
            'ruleId': '@studnicky/interface-suffix'
          }
        ],
        'filename': 'Callable.ts',
        'name': 'callable interface'
      },
      {
        'code': 'interface Snapshot { readonly value: string; }',
        'expected': [
          {
            'messageId': 'missing-interface-suffix',
            'ruleId': '@studnicky/interface-suffix'
          },
          {
            'messageId': 'inlineObjectInInterface',
            'ruleId': '@studnicky/interfaces-compose-named-types'
          }
        ],
        'filename': 'Snapshot.ts',
        'name': 'readonly contract with uncomposed primitive data'
      },
      {
        'code': 'interface HandlerInterface { run(): void; config: { retries: number }; }',
        'expected': [
          {
            'messageId': 'inlineObjectInInterface',
            'ruleId': '@studnicky/interfaces-compose-named-types'
          }
        ],
        'filename': 'HandlerInterface.ts',
        'name': 'contract with inline pure data'
      },
      {
        'code': [
          "import type { FromSchema, JSONSchema } from 'json-schema-to-ts';",
          "const ValueSchema = { 'type': 'string' } as const satisfies JSONSchema;",
          'type ValueType = FromSchema<typeof ValueSchema>;'
        ].join('\n'),
        'expected': [
          {
            'messageId': 'forbidden-type-alias',
            'ruleId': '@studnicky/all-types-are-entities'
          }
        ],
        'filename': 'packages/retry/src/models/MisplacedCanonical.ts',
        'name': 'misplaced canonical alias'
      },
      {
        'code': 'type InvalidDataType = { value: string };',
        'expected': [
          {
            'messageId': 'derivedFromSchema',
            'ruleId': '@studnicky/type-alias-invariants'
          }
        ],
        'filename': 'InvalidInlineAlias.ts',
        'name': 'invalid inline alias'
      },
      {
        'code': [
          'interface RunnerInterface { run(): void; }',
          'type RunnerAliasType = RunnerInterface;'
        ].join('\n'),
        'expected': [
          {
            'messageId': 'aliasMustBeInterface',
            'ruleId': '@studnicky/type-alias-invariants'
          }
        ],
        'filename': 'NakedAlias.ts',
        'name': 'contract alias receives the declaration-kind verdict'
      },
      {
        'code': 'interface Collision { value: string; }',
        'expected': [
          {
            'messageId': 'dataShapeMustBeType',
            'ruleId': '@studnicky/interface-must-be-contract'
          }
        ],
        'filename': 'SuffixCollision.ts',
        'name': 'pure-data suffix collision'
      },
      {
        'code': 'interface Handler { run(): void; config: { retries: number }; }',
        'expected': [
          {
            'messageId': 'missing-interface-suffix',
            'ruleId': '@studnicky/interface-suffix'
          },
          {
            'messageId': 'inlineObjectInInterface',
            'ruleId': '@studnicky/interfaces-compose-named-types'
          }
        ],
        'filename': 'DualRemediation.ts',
        'name': 'retained contract with suffix and inline-data defects'
      }
    ];

    for (const scenario of scenarios) {
      const linter = new Linter();
      const messages = linter.verify(
        scenario.code,
        [
          {
            'files': ['**/*.ts'],
            languageOptions,
            'plugins': { '@typescript-eslint': tseslint.plugin }
          },
          entitySuite
        ],
        { 'filename': scenario.filename }
      );
      const diagnostics = messages.map((message) => {
        return {
          'messageId': message.messageId,
          'ruleId': message.ruleId
        };
      });

      assert.deepEqual(diagnostics, scenario.expected, scenario.name);
    }
  });
});
