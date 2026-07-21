import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { interfaceSuffix } from '../../src/rules/interfaceSuffix.js';

RuleTester.describe = describe;
RuleTester.it = it;

// Workspace root — projectService resolves the tsconfig and @studnicky/* module
// symbols from here.
const repoRoot = resolve(import.meta.dirname, '../../../..');

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

ruleTester.run('interface-suffix', interfaceSuffix, {
  'valid': [
    {
      'code': 'interface FooInterface { readonly x: number; }',
      'name': 'readonly contract ending with Interface'
    },
    {
      'code': 'namespace X { interface FooInterface { readonly x: number; } }',
      'name': 'namespace contract ending with Interface'
    },
    {
      'code': 'interface PureData { value: string; count: number; }',
      'name': 'pure-data interface is owned by interface-must-be-contract'
    },
    {
      'code': 'interface Empty {}',
      'name': 'empty interface is owned by interface-must-be-contract'
    }
  ],
  'invalid': [
    {
      'code': 'interface Foo { readonly x: number; }',
      'errors': [{ 'messageId': 'missing-interface-suffix' }],
      'name': 'readonly contract missing Interface suffix'
    },
    {
      'code': 'namespace X { interface Foo { readonly x: number; } }',
      'errors': [{ 'messageId': 'missing-interface-suffix' }],
      'name': 'namespace contract missing Interface suffix'
    },
    {
      'code': 'interface Callable { (): void; }',
      'errors': [{ 'messageId': 'missing-interface-suffix' }],
      'name': 'callable contract missing Interface suffix'
    },
    {
      'code': 'interface RuntimeOwner { value: Date; }',
      'errors': [{ 'messageId': 'missing-interface-suffix' }],
      'name': 'runtime contract missing Interface suffix'
    },
    {
      'code': 'interface Branded { readonly __brand: unique symbol; value: string; }',
      'errors': [{ 'messageId': 'missing-interface-suffix' }],
      'name': 'brand contract missing Interface suffix'
    },
    {
      'code': 'interface NonSchema { value: unknown; }',
      'errors': [{ 'messageId': 'missing-interface-suffix' }],
      'name': 'non-schema contract missing Interface suffix'
    },
    {
      'code': 'interface Handler { run(): void; config: { retries: number }; }',
      'errors': [{ 'messageId': 'missing-interface-suffix' }],
      'name': 'contract with inline pure data missing Interface suffix'
    }
  ]
});
