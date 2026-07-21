import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { Linter, RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { interfaceMustBeContract } from '../../src/rules/interfaceMustBeContract.js';
import { interfacesComposeNamedTypes } from '../../src/rules/interfacesComposeNamedTypes.js';

const repoRoot = resolve(import.meta.dirname, '../../../..');

const canonicalDataSource = [
  "import type { FromSchema, JSONSchema } from 'json-schema-to-ts';",
  "const DataSchema = { properties: { value: { type: 'number' } }, required: ['value'], type: 'object' } as const satisfies JSONSchema;",
  'type DataType = FromSchema<typeof DataSchema>;'
].join('\n');

RuleTester.describe = describe;
RuleTester.it = it;

const languageOptions = {
  'parser': parser,
  'parserOptions': {
    'projectService': {
      'allowDefaultProject': ['*.ts']
    },
    'tsconfigRootDir': repoRoot
  }
};

const ruleTester = new RuleTester({ languageOptions });

ruleTester.run('interfaces-compose-named-types', interfacesComposeNamedTypes, {
  'valid': [
    {
      'code': `${canonicalDataSource}\ninterface ServiceInterface { readonly data: DataType; }`,
      'name': 'readonly contract composes named data'
    },
    {
      'code': 'interface PureDataInterface { data: { value: number }; }',
      'name': 'pure-data interface is owned by interface-must-be-contract'
    },
    {
      'code': 'interface ServiceInterface<T extends { value: number }> { run(value: T): void; }',
      'name': 'generic constraint inspection does not author inline interface data'
    },
    {
      'code': 'type DataType = { value: number };',
      'name': 'type aliases are outside interface composition'
    },
    {
      'code': 'interface ServiceInterface { run(): void; }',
      'name': 'contract without inline data is valid'
    },
    {
      'code': `${canonicalDataSource}\ninterface RegistryInterface { values: ReadonlyArray<DataType>; }`,
      'name': 'readonly named data is valid contract composition'
    },
    {
      'code': 'interface ServiceInterface { run(): void; handle: (value: string) => void; }',
      'name': 'callable properties are contract members rather than pure data'
    },
    {
      'code': 'interface HandlerInterface { (value: string): void } interface OwnerInterface { handler: HandlerInterface }',
      'name': 'named callable interface properties are contract members'
    },
    {
      'code': 'interface RuntimeOwnerInterface { pattern: RegExp; error: Error; signal: AbortSignal; bytes: Uint8Array; buffer: ArrayBuffer; url: URL; }',
      'name': 'runtime provider properties are contract members'
    },
    {
      'code': 'interface ServiceInterface { readonly runtime: { execute(input: string): void; nested: { (input: string): void } }; }',
      'name': 'nested callable contract objects are not pure-data portions'
    },
    {
      'code': [
        "interface MachineInterface<",
        "  TState extends { readonly 'variant': string },",
        "  TEvent extends { readonly 'type': string },",
        "  TEffect extends { readonly 'variant': string } = never",
        '> {',
        '  run(): void;',
        "  readonly 'state': TState;",
        "  readonly 'event': TEvent;",
        "  readonly 'effects': TEffect[];",
        '}'
      ].join('\n'),
      'name': 'type-parameter constraints and generic payload members are not proven pure data'
    },
    {
      'code': "interface CacheNodeInterface<K, V> { dispose(): void; 'key': K; 'value': V; }",
      'name': 'unconstrained key and value payloads are not proven pure data'
    },
    {
      'code': "interface PageStateInterface<TPage, TCursor> { next(): void; readonly 'cursor': TCursor; readonly 'pages': TPage[]; }",
      'name': 'generic scalar and array payloads are not proven pure data'
    },
    {
      'code': "interface SubclassInterface<TInstance extends object> { new(): TInstance; readonly 'prototype': TInstance; }",
      'name': 'constructor prototype members remain runtime contracts'
    },
    {
      'code': 'class Service {} interface ServiceFactoryInterface { readonly runtime: { service: Service; factory: { new(): Service } }; }',
      'name': 'nested class-bearing and constructor contract objects are not pure-data portions'
    },
    {
      'code': 'interface ResultInterface { readonly result: { value: unknown } }',
      'name': 'unknown-bearing inline object is a contract portion'
    },
    {
      'code': "interface EventPortInterface { publish(): void; readonly event: { error: unknown; key: string }; }",
      'name': 'a scalar sibling inside an unknown-bearing collaborator is not separately proven data'
    },
    {
      'code': "interface StrategyInterface { wait(options?: { signal?: AbortSignal; tokens?: number }): Promise<void>; }",
      'name': 'a scalar sibling inside runtime-bearing options is not separately proven data'
    },
    {
      'code': "type Keys = 'start' | 'stop'; interface HandlersInterface { readonly handlers: { [Key in Keys]: () => void } }",
      'name': 'mapped callable values are contract portions'
    }
  ],
  'invalid': [
    {
      'code': 'interface ServiceInterface { run(): void; config: { retries: number }; }',
      'errors': [{ 'messageId': 'inlineObjectInInterface' }],
      'name': 'callable contract with inline property data'
    },
    {
      'code': "interface ServiceInterface { run(): void; retries: number; phase: 'start'; labels: string[]; }",
      'errors': [
        {
          'data': { 'interfaceName': 'ServiceInterface', 'memberName': 'retries' },
          'messageId': 'inlineObjectInInterface'
        },
        {
          'data': { 'interfaceName': 'ServiceInterface', 'memberName': 'phase' },
          'messageId': 'inlineObjectInInterface'
        },
        {
          'data': { 'interfaceName': 'ServiceInterface', 'memberName': 'labels' },
          'messageId': 'inlineObjectInInterface'
        }
      ],
      'name': 'primitive, string-literal, and array data members require named schema-derived composition'
    },
    {
      'code': 'type DataType = { value: number }; interface ServiceInterface { run(): void; data: DataType; }',
      'errors': [{
        'data': { 'interfaceName': 'ServiceInterface', 'memberName': 'data' },
        'messageId': 'inlineObjectInInterface'
      }],
      'name': 'non-schema named aliases do not satisfy data composition'
    },
    {
      'code': 'interface ServiceInterface { method(): { value: number }; }',
      'errors': [{ 'messageId': 'inlineObjectInInterface' }],
      'name': 'callable contract with inline return data'
    },
    {
      'code': "interface ServiceInterface { run(options?: { timeout?: number; mode?: 'safe' }): void; }",
      'errors': [{ 'messageId': 'inlineObjectInInterface' }],
      'name': 'pure-data options inside an operational interface require named composition'
    },
    {
      'code': 'interface RegistryInterface { readonly [key: string]: { value: number }; }',
      'errors': [{ 'messageId': 'inlineObjectInInterface' }],
      'name': 'readonly contract with inline index data'
    },
    {
      'code': "type Keys = 'first' | 'second'; interface ServiceInterface { run(): void; values: { [Key in Keys]: string }; }",
      'errors': [{ 'messageId': 'inlineObjectInInterface' }],
      'name': 'callable contract with inline mapped data'
    },
    {
      'code': 'interface SnapshotInterface { readonly data: { value: number }; }',
      'errors': [{ 'messageId': 'inlineObjectInInterface' }],
      'name': 'readonly contract still requires named data'
    },
    {
      'code': 'interface ServiceInterface { readonly runtime: { execute(): void; config: { retries: number } } }',
      'errors': [{
        'data': { 'interfaceName': 'ServiceInterface', 'memberName': 'config' },
        'messageId': 'inlineObjectInInterface'
      }],
      'name': 'nested pure data inside a callable contract is the reported portion'
    },
    {
      'code': "type Keys = 'primary' | 'secondary'; interface ServiceInterface { readonly runtime: { execute(): void; labels: { [Key in Keys]: string } } }",
      'errors': [{
        'data': { 'interfaceName': 'ServiceInterface', 'memberName': 'labels' },
        'messageId': 'inlineObjectInInterface'
      }],
      'name': 'pure-data mapped values inside a callable contract are reported'
    }
  ]
});
it('combined interface rules emit only the owning pure-data diagnostic', () => {
  const linter = new Linter();
  const messages = linter.verify(
    'interface PureDataInterface { data: { value: number }; }',
    [
      {
        'files': ['**/*.ts'],
        languageOptions,
        'plugins': {
          'local': {
            'rules': {
              'interface-must-be-contract': interfaceMustBeContract,
              'interfaces-compose-named-types': interfacesComposeNamedTypes
            }
          }
        },
        'rules': {
          'local/interface-must-be-contract': 'error',
          'local/interfaces-compose-named-types': 'error'
        }
      }
    ],
    { 'filename': 'combined-interface.ts' }
  );

  assert.deepEqual(
    messages.map((message) => message.messageId),
    ['dataShapeMustBeType']
  );
});
