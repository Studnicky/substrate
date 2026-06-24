import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noPreferExistingType } from '../../src/rules/noPreferExistingType.js';

// Workspace root — projectService resolves the tsconfig and @studnicky/* module
// symbols from here.
const repoRoot = resolve(import.meta.dirname, '../../../..');

RuleTester.describe = describe;
RuleTester.it = it;

// Type-aware rule: requires projectService to resolve module symbols.
// Tests use @studnicky/eslint-config (this package itself, resolvable via workspace).
//
// Exported shapes used for testing:
//   EslintConfigOptionsType = { readonly 'tsconfigRootDir'?: string }
//     => 0 required fields, 1 optional field
//   plugin = { readonly 'rules': Record<string, RuleModule> }
//     => 1 required field with complex value type
//
// Classification algorithm (type-only, no name matching):
//   Gate 1: imported assignable to local (imported covers local's shape)
//   Gate 2: local assignable to imported (bilateral)
//   Gate 3 (when bilateral): compare req/opt counts (exactMatch or nearMatch)
//   subsumedMatch: Gate 1 passes, Gate 2 fails

const ruleTester = new RuleTester({
  'languageOptions': {
    'parser': parser,
    'parserOptions': {
      'projectService': {
        'allowDefaultProject': ['*.ts']
      },
      'tsconfigRootDir': repoRoot
    }
  }
});

ruleTester.run('no-prefer-existing-type', noPreferExistingType, {
  'invalid': [
    {
      'code': [
        "import type { EslintConfigOptionsType } from '@studnicky/eslint-config';",
        'type LocalOptsType = { tsconfigRootDir?: string };'
      ].join('\n'),
      'errors': [{ 'messageId': 'exactMatch' }],
      'name': 'exactMatch: local type is structurally identical to imported type',
      'options': [{ 'exactMatch': 'error', 'minFields': 1 }]
    },
    {
      'code': [
        "import type { EslintConfigOptionsType } from '@studnicky/eslint-config';",
        'type LocalOptsType = { tsconfigRootDir?: string; extraField?: number };'
      ].join('\n'),
      'errors': [{ 'messageId': 'nearMatch' }],
      'name': 'nearMatch: local has same required fields as imported but different optional count',
      'options': [{ 'minFields': 1, 'nearMatch': 'error' }]
    },
    {
      'code': [
        "import { plugin } from '@studnicky/eslint-config';",
        'type LocalPluginType = { rules: Record<string, unknown> };'
      ].join('\n'),
      'errors': [{ 'messageId': 'subsumedMatch' }],
      'name': 'subsumedMatch: local type covered by imported but not the reverse due to narrower value types',
      'options': [{ 'minFields': 1, 'subsumedMatch': 'error' }]
    }
  ],
  'valid': [
    {
      'code': 'type FooType = { a: string; b: number };',
      'name': 'no imports from any package — rule does not fire'
    },
    {
      'code': [
        "import type { EslintConfigOptionsType } from '@studnicky/eslint-config';",
        'type FooType = { a: string; b: number };'
      ].join('\n'),
      'name': 'imports present but local type has unrelated fields — no match',
      'options': [{ 'minFields': 2 }]
    },
    {
      'code': [
        "import type { EslintConfigOptionsType } from '@studnicky/eslint-config';",
        'type LocalOptsType = { tsconfigRootDir?: string };'
      ].join('\n'),
      'name': 'below minFields threshold — rule does not fire',
      'options': [{ 'minFields': 2 }]
    },
    {
      'code': [
        "import { Buffer } from 'node:buffer';",
        'type LocalType = { data: unknown };'
      ].join('\n'),
      'name': 'node: prefix is excluded by default — rule does not fire'
    },
    {
      'code': [
        "import type { EslintConfigOptionsType } from '@studnicky/eslint-config';",
        'type LocalOptsType = { tsconfigRootDir?: string };'
      ].join('\n'),
      'name': 'exactMatch severity set to off — rule does not fire',
      'options': [{ 'exactMatch': 'off', 'minFields': 1 }]
    },
    {
      'code': [
        "import type { EslintConfigOptionsType } from '@studnicky/eslint-config';",
        'type LocalOptsType = { tsconfigRootDir?: string; extraRequired: number };'
      ].join('\n'),
      'name': 'local type has more required fields than imported — imported does not cover local (off)',
      'options': [{ 'minFields': 1 }]
    }
  ]
});
