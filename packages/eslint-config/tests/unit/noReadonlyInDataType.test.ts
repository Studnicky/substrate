import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { noReadonlyInDataType } from '../../src/rules/noReadonlyInDataType.js';

// Workspace root — projectService resolves tsconfig and module symbols from here.
const repoRoot = resolve(import.meta.dirname, '../../../..');

RuleTester.describe = describe;
RuleTester.it = it;

// Type-aware rule: requires projectService to resolve alias types via the checker.
// bakesReadonly() drives all detection — no name matching, no allow-list.
// Generic transforms (mapped/conditional) resolve to no concrete readonly members
// and are therefore valid without any name special-casing.

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

ruleTester.run('no-readonly-in-data-type', noReadonlyInDataType, {
  'valid': [
    {
      'name': 'mutable exported type alias — no readonly anywhere',
      'code': 'export type MutableType = { a: number; items: string[]; nested: { x: number } };'
    },
    {
      'name': 'mutable exported tuple — no readonly',
      'code': 'export type MutTuple = [number, string];'
    },
    {
      'name': 'generic mapped transform — DeepReadonlyType<T> resolves to no concrete readonly members with unbound T',
      'code': 'export type DeepReadonlyType<T> = { readonly [K in keyof T]: T[K] };'
    },
    {
      'name': 'generic conditional type — DeepMergeType<A,B> resolves clean with unbound type params',
      'code': 'export type DeepMergeType<A, B> = A extends readonly unknown[] ? B : A;'
    },
    {
      'name': 'non-generic conditional guard — GuardType resolves to a numeric literal with no readonly members',
      'code': 'export type GuardType = string extends readonly unknown[] ? 1 : 2;'
    },
    {
      'name': 'reference to a readonly type — item property resolves via named aliasSymbol, isInlineStructural stops recursion',
      'code': [
        'type FlatType = { readonly a: number };',
        'export type RefType = { item: FlatType };'
      ].join('\n')
    },
    {
      'name': 'non-exported type alias with readonly — parent.type !== ExportNamedDeclaration, out of scope',
      'code': 'type PrivateType = { readonly a: number };'
    },
    {
      'name': 'interface with readonly members — rule only targets TSTypeAliasDeclaration',
      'code': 'interface ContractI { readonly a: number; }'
    }
  ],
  'invalid': [
    {
      'name': 'flat readonly property signature — bakes readonly into own inline shape',
      'code': 'export type FlatType = { readonly a: number };',
      'errors': [{ 'messageId': 'noReadonly' }],
      'output': 'export type FlatType = { a: number };'
    },
    {
      'name': 'nested inline readonly property — recursion into anonymous object type',
      'code': 'export type NestedType = { outer: { readonly deep: string } };',
      'errors': [{ 'messageId': 'noReadonly' }],
      'output': 'export type NestedType = { outer: { deep: string } };'
    },
    {
      'name': 'readonly array in property type — ArrPropType bakes readonly via TSTypeOperator',
      'code': 'export type ArrPropType = { items: readonly string[] };',
      'errors': [{ 'messageId': 'noReadonly' }],
      'output': 'export type ArrPropType = { items: string[] };'
    },
    {
      'name': 'readonly index signature — DictType bakes readonly via TSIndexSignature',
      'code': 'export type DictType = { readonly [k: string]: number };',
      'errors': [{ 'messageId': 'noReadonly' }],
      'output': 'export type DictType = { [k: string]: number };'
    },
    {
      'name': 'readonly array alias — ROArrayAlias is a top-level readonly array via TSTypeOperator',
      'code': 'export type ROArrayAlias = readonly string[];',
      'errors': [{ 'messageId': 'noReadonly' }],
      'output': 'export type ROArrayAlias = string[];'
    },
    {
      'name': 'readonly tuple alias — TupleAlias bakes readonly via tuple target.readonly',
      'code': 'export type TupleAlias = readonly [number, string];',
      'errors': [{ 'messageId': 'noReadonly' }],
      'output': 'export type TupleAlias = [number, string];'
    },
    {
      'name': 'self-recursive type with readonly children array — visited Set prevents infinite loop',
      'code': 'export type RecursiveType = { name: string; children: readonly RecursiveType[] };',
      'errors': [{ 'messageId': 'noReadonly' }],
      'output': 'export type RecursiveType = { name: string; children: RecursiveType[] };'
    },
    {
      'name': 'multiple readonly property signatures — each reported independently, both removed by fixer',
      'code': 'export type MultiType = { readonly a: number; readonly b: string };',
      'errors': [{ 'messageId': 'noReadonly' }, { 'messageId': 'noReadonly' }],
      'output': 'export type MultiType = { a: number; b: string };'
    }
  ]
});
