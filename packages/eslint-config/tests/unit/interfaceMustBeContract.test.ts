import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { interfaceMustBeContract } from '../../src/rules/interfaceMustBeContract.js';

const repoRoot = resolve(import.meta.dirname, '../../../..');

RuleTester.describe = describe;
RuleTester.it = it;

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

ruleTester.run('interface-must-be-contract', interfaceMustBeContract, {
  'valid': [
    {
      'name': 'interface with a method signature is a contract',
      'code': `interface Runner { run(): void; }`
    },
    {
      'name': 'interface with a call signature is a contract',
      'code': `interface Factory { (): number; }`
    },
    {
      'name': 'interface with a construct signature is a contract',
      'code': `interface Ctor { new (): object; }`
    },
    {
      'name': 'function-valued property is a non-serializable contract signal',
      'code': `interface ClockSource { readonly tick?: () => number; }`
    },
    {
      'name': 'constructor-typed property is a contract signal',
      'code': `interface Builder { make: new () => object; }`
    },
    {
      'name': 'class-instance reference is a contract signal',
      'code': `class Logger {} interface WithLogger { logger: Logger; }`
    },
    {
      'name': 'Date-valued property is a contract signal',
      'code': `interface WithDate { when: Date; }`
    },
    {
      'name': 'Map-valued property is a contract signal',
      'code': `interface WithMap { m: Map<string, number>; }`
    },
    {
      'name': 'array of function types is a contract signal',
      'code': `interface Transports { transports: ReadonlyArray<() => void>; }`
    },
    {
      'name': 'allow option exempts a named pure-data interface',
      'code': `interface LegacyShape { id: string; }`,
      'options': [{ 'allow': ['LegacyShape'] }]
    },
    {
      'name': 'empty interface is exempt — the standard consumer-declaration-merge idiom, with no shape to preserve as a type',
      'code': `interface Empty {}`
    }
  ],
  'invalid': [
    {
      'name': 'pure primitive data shape must be a type',
      'code': `interface Point { x: number; y: number; }`,
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': `type Point = { x: number; y: number; };`
    },
    {
      'name': 'nested object literal of primitives is data',
      'code': `interface Config { nested: { depth: number; label: string }; }`,
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': `type Config = { nested: { depth: number; label: string }; };`
    },
    {
      'name': 'index signature of primitives is data',
      'code': `interface Dict { [key: string]: number; }`,
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': `type Dict = { [key: string]: number; };`
    },
    {
      'name': 'array of primitives is data',
      'code': `interface Bag { items: number[]; }`,
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': `type Bag = { items: number[]; };`
    },
    {
      'name': 'generic interface whose body uses the type parameter — headline fix',
      'code': `interface Box<T> { v: T; }`,
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': `type Box<T> = { v: T; };`
    },
    {
      'name': 'generic interface with primitive body — type parameters preserved',
      'code': `interface Wrapper<_T> { count: number; }`,
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': `type Wrapper<_T> = { count: number; };`
    },
    {
      'name': 'union of primitives is data',
      'code': `interface U { v: string | number; }`,
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': `type U = { v: string | number; };`
    },
    {
      'name': 'enum-typed property is serializable — interface reports',
      'code': `enum E { A, B } interface WithEnum { e: E; }`,
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': `enum E { A, B } type WithEnum = { e: E; };`
    },
    {
      'name': 'sibling pure-data type alias property is serializable — interface reports',
      'code': `type DataT = { a: number }; interface Foo { d: DataT; }`,
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': `type DataT = { a: number }; type Foo = { d: DataT; };`
    },
    {
      'name': 'exported data-shape interface becomes exported type',
      'code': `export interface Foo { a: number; }`,
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': `export type Foo = { a: number; };`
    },
    {
      'name': 'single extends clause becomes intersection — Base declared inline',
      'code': `type Base = { y: number }; interface A extends Base { x: number; }`,
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': `type Base = { y: number }; type A = { x: number; } & Base;`
    },
    {
      'name': 'exported interface with extends becomes exported intersection type',
      'code': `type Base = { y: number }; export interface Foo extends Base { a: number; }`,
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': `type Base = { y: number }; export type Foo = { a: number; } & Base;`
    },
    {
      'name': 'declare modifier is preserved',
      'code': `declare interface Bar { a: number; }`,
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': `declare type Bar = { a: number; };`
    },
    {
      'name': 'declaration merging — no fix applied',
      'code': `interface Dup { a: number; } interface Dup { b: number; }`,
      'errors': [
        { 'messageId': 'dataShapeMustBeType' },
        { 'messageId': 'dataShapeMustBeType' }
      ],
      'output': null
    },
    {
      'name': 'global augmentation — no fix applied',
      'code': `declare global { interface GlobalShape { a: number; } }`,
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': null
    }
  ]
});
