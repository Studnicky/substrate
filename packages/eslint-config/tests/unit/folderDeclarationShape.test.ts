import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { folderDeclarationShape } from '../../src/rules/folderDeclarationShape.js';

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

ruleTester.run('folder-declaration-shape', folderDeclarationShape, {
  'valid': [
    {
      'code': 'export interface FooInterface { readonly id: string; run(): void; }',
      'filename': '/project/src/interfaces/FooInterface.ts',
      'name': 'interface declared under interfaces/ folder — not flagged'
    },
    {
      'code': 'export type FooType = { readonly id: string };',
      'filename': '/project/src/types/FooType.ts',
      'name': 'type alias declared under types/ folder — not flagged'
    },
    {
      'code': 'export type FooType = { readonly id: string };',
      'filename': '/project/src/entities/Foo.ts',
      'name': 'type alias not under interfaces/ or types/ (entities/) — not flagged'
    },
    {
      'code': 'export type FooType = { readonly id: string };',
      'filename': '/project/src/Foo.ts',
      'name': 'type alias directly under src/, no interfaces/ or types/ segment — not flagged'
    },
    {
      'code': 'export type FooType = { readonly id: string };',
      'filename': '/project/packages/logger/tests/unit/interfaces/FooType.test.ts',
      'name': 'file under tests/ path — exempt even though it contains a misplaced declaration'
    },
    {
      'code': 'function wrapper(): void { type Local = { a: number }; }',
      'filename': '/project/src/interfaces/Wrapper.ts',
      'name': 'nested type alias inside a function body under interfaces/ — not flagged (not top-level)'
    },
    {
      'code': 'namespace Ns { export interface Nested { run(): void; } }',
      'filename': '/project/src/types/Namespaced.ts',
      'name': 'nested interface inside a namespace under types/ — not flagged (not top-level)'
    }
  ],
  'invalid': [
    {
      'code': 'export type FooType = { readonly id: string };',
      'errors': [{ 'messageId': 'typeInInterfacesFolder' }],
      'filename': '/project/src/interfaces/FooType.ts',
      'name': 'type alias (pure data) declared under interfaces/ folder — flagged'
    },
    {
      'code': 'export interface FooInterface { readonly id: string; }',
      'errors': [{ 'messageId': 'interfaceInTypesFolder' }],
      'filename': '/project/src/types/FooInterface.ts',
      'name': 'interface declared under types/ folder — flagged'
    },
    {
      'code': 'export type LogBodyDataType = { context: Record<string, unknown>; event: string; };',
      'errors': [{ 'messageId': 'typeInInterfacesFolder' }],
      'filename': '/repo/packages/logger/src/interfaces/LogBodyDataType.ts',
      'name': 'real-world case: LogBodyDataType pure data type alias in interfaces/ — flagged'
    }
  ]
});
