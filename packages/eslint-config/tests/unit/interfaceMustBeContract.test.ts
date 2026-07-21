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
      'name': 'method signature is a callable contract',
      'code': 'interface RunnerInterface { run(): void; }'
    },
    {
      'name': 'call signature is a callable contract',
      'code': 'interface FactoryInterface { (): number; }'
    },
    {
      'name': 'construct signature is a constructor contract',
      'code': 'interface ConstructorInterface { new (): object; }'
    },
    {
      'name': 'readonly property is an access contract',
      'code': 'interface SnapshotInterface { readonly value: string; }'
    },
    {
      'name': 'readonly index signature is an access contract',
      'code': 'interface RegistryInterface { readonly [key: string]: number; }'
    },
    {
      'name': 'intrinsic Readonly is an access contract',
      'code': 'interface SnapshotInterface { value: Readonly<{ id: string }>; }'
    },
    {
      'name': 'intrinsic ReadonlyArray is an access contract',
      'code': 'interface RegistryInterface { values: ReadonlyArray<string>; }'
    },
    {
      'name': 'readonly alias indirection is an access contract',
      'code': 'type ValuesType = readonly string[]; interface RegistryInterface { values: ValuesType; }'
    },
    {
      'name': 'function-valued named-data property is a callable contract',
      'code': 'type EventType = { id: string }; interface HandlerInterface { handle: (event: EventType) => void; }'
    },
    {
      'name': 'named callable interface property is a callable contract',
      'code': 'interface HandlerInterface { (value: string): void } interface OwnerInterface { handler: HandlerInterface }'
    },
    {
      'name': 'constructor-typed property is a constructor contract',
      'code': 'interface BuilderInterface { make: new () => object; }'
    },
    {
      'name': 'class-instance reference is a runtime contract',
      'code': 'class Logger {} interface LoggerOwnerInterface { logger: Logger; }'
    },
    {
      'name': 'global runtime providers are runtime contracts',
      'code': 'interface RuntimeOwnerInterface { pattern: RegExp; error: Error; signal: AbortSignal; bytes: Uint8Array; buffer: ArrayBuffer; url: URL; }'
    },
    {
      'name': 'readonly unique-symbol brand with named data is a contract',
      'code': 'type ValueType = string; interface UserIdInterface { readonly __brand: unique symbol; value: ValueType; }'
    }
  ],
  'invalid': [
    {
      'name': 'empty interface has no implicit contract signal',
      'code': 'interface EmptyInterface {}',
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': null
    },
    {
      'name': 'pure primitive data interface requires entity construction',
      'code': 'interface PointInterface { x: number; y: number; }',
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': null
    },
    {
      'name': 'nested pure-data interface requires entity construction',
      'code': 'interface ConfigInterface { nested: { depth: number; label: string }; }',
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': null
    },
    {
      'name': 'pure-data index signature requires entity construction',
      'code': 'interface DictInterface { [key: string]: number; }',
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': null
    },
    {
      'name': 'pure-data array property requires entity construction',
      'code': 'interface BagInterface { items: number[]; }',
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': null
    },
    {
      'name': 'generic pure-data interface requires entity construction',
      'code': 'interface BoxInterface<T> { value: T; }',
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': null
    },
    {
      'name': 'primitive union remains pure data',
      'code': 'interface UnionInterface { value: string | number; }',
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': null
    },
    {
      'name': 'enum-valued property remains pure data',
      'code': 'enum Value { A, B } interface EnumOwnerInterface { value: Value; }',
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': null
    },
    {
      'name': 'named pure-data alias property remains pure data',
      'code': 'type DataType = { value: number }; interface DataOwnerInterface { data: DataType; }',
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': null
    },
    {
      'name': 'exported pure-data interface remains non-fixable',
      'code': 'export interface ExportedInterface { value: number; }',
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': null
    },
    {
      'name': 'pure-data heritage remains non-fixable',
      'code': 'interface BaseInterface { base: number; } interface ChildInterface extends BaseInterface { value: number; }',
      'errors': [
        { 'messageId': 'dataShapeMustBeType' },
        { 'messageId': 'dataShapeMustBeType' }
      ],
      'output': null
    },
    {
      'name': 'merged pure-data interfaces remain non-fixable',
      'code': 'interface MergedInterface { first: number; } interface MergedInterface { second: number; }',
      'errors': [
        { 'messageId': 'dataShapeMustBeType' },
        { 'messageId': 'dataShapeMustBeType' }
      ],
      'output': null
    },
    {
      'name': 'augmentation pure-data interface remains non-fixable',
      'code': 'declare global { interface GlobalShapeInterface { value: number; } }',
      'errors': [{ 'messageId': 'dataShapeMustBeType' }],
      'output': null
    }
  ]
});
