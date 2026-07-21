import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import { Linter, RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';

import { interfaceMustBeContract } from '../../src/rules/interfaceMustBeContract.js';
import { typeAliasInvariants } from '../../src/rules/typeAliasInvariants.js';

const repoRoot = resolve(import.meta.dirname, '../../../..');

RuleTester.describe = describe;
RuleTester.it = it;

const languageOptions = {
  'parser': parser,
  'parserOptions': {
    'projectService': {
      'allowDefaultProject': ['*.ts', 'packages/eslint-config/*.ts', 'src/entities/*.ts'],
      'maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING': 30
    },
    'tsconfigRootDir': repoRoot
  }
};

const scalarSchemaSource = [
  "import type { FromSchema, JSONSchema } from 'json-schema-to-ts';",
  "const ValueSchema = { type: 'string' } as const satisfies JSONSchema;"
].join('\n');

const entitySource = [
  "import type { FromSchema, JSONSchema } from 'json-schema-to-ts';",
  "const ValueSchema = { type: 'string' } as const satisfies JSONSchema;",
  'type ValueType = FromSchema<typeof ValueSchema>;'
].join('\n');

const exactImportedShapeSource = [
  "import type { ImportedPureDataInterface } from './tests/fixtures/ImportedPureDataInterface.js';",
  "import type { FromSchema, JSONSchema } from 'json-schema-to-ts';",
  'const LocalSchema = {',
  "  additionalProperties: false,",
  "  properties: { first: { type: 'string' }, second: { type: 'number' } },",
  "  required: ['first', 'second'],",
  "  type: 'object'",
  '} as const satisfies JSONSchema;',
  'type LocalType = FromSchema<typeof LocalSchema>;'
].join('\n');

const ruleTester = new RuleTester({ languageOptions });

ruleTester.run('type-alias-invariants', typeAliasInvariants, {
  'valid': [
    {
      'code': [scalarSchemaSource, 'export type ValueType = FromSchema<typeof ValueSchema>;'].join('\n'),
      'filename': 'packages/eslint-config/Canonical.ts',
      'name': 'direct schema-derived data is canonical'
    },
    {
      'code': [
        scalarSchemaSource,
        'type ValueType = FromSchema<typeof ValueSchema>;',
        'export type ValueCollectionType = ValueType[] | null;'
      ].join('\n'),
      'filename': 'packages/eslint-config/CanonicalComposition.ts',
      'name': 'verified canonical roots compose deterministically'
    },
    {
      'code': [entitySource, 'type MutableCollectionType = ValueType[];'].join('\n'),
      'filename': 'packages/eslint-config/MutableCollection.ts',
      'name': 'mutable canonical composition does not author readonly policy'
    },
    {
      'code': "import { type FooType } from './foo.js';",
      'name': 'direct import preserves the canonical name'
    },
    {
      'code': 'interface HandlerInterface { (value: string): void; }',
      'name': 'interfaces are owned by interface rules'
    },
    {
      'code': [
        "import type { ImportedPureDataInterface } from './packages/eslint-config/tests/fixtures/ImportedPureDataInterface.js';",
        "import type { FromSchema, JSONSchema } from 'json-schema-to-ts';",
        'const NearSchema = {',
        "  additionalProperties: false,",
        "  properties: { first: { type: 'string' }, optionalExtra: { type: 'string' }, second: { type: 'number' } },",
        "  required: ['first', 'second'],",
        "  type: 'object'",
        '} as const satisfies JSONSchema;',
        'type NearType = FromSchema<typeof NearSchema>;'
      ].join('\n'),
      'filename': 'packages/eslint-config/NearCanonical.ts',
      'name': 'near structural similarity does not block a distinct canonical data type'
    },
    {
      'code': [
        "import type { ImportedPureDataInterface } from './packages/eslint-config/tests/fixtures/ImportedPureDataInterface.js';",
        "import type { FromSchema, JSONSchema } from 'json-schema-to-ts';",
        'const NarrowSchema = {',
        "  additionalProperties: false,",
        "  properties: { first: { const: 'fixed', type: 'string' }, second: { type: 'number' } },",
        "  required: ['first', 'second'],",
        "  type: 'object'",
        '} as const satisfies JSONSchema;',
        'type NarrowType = FromSchema<typeof NarrowSchema>;'
      ].join('\n'),
      'filename': 'packages/eslint-config/NarrowCanonical.ts',
      'name': 'subsumed structural similarity does not block a distinct canonical data type'
    },
    {
      'code': exactImportedShapeSource,
      'filename': 'packages/eslint-config/ExactCanonical.ts',
      'name': 'structural equality does not override independent canonical provenance'
    }
  ],
  'invalid': [
    {
      'code': 'type HandlerType = (value: string) => void;',
      'errors': [{ 'messageId': 'aliasMustBeInterface' }],
      'name': 'callable alias receives the declaration-kind verdict'
    },
    {
      'code': 'type ConstructorType = new (value: string) => object;',
      'errors': [{ 'messageId': 'aliasMustBeInterface' }],
      'name': 'constructor alias receives the declaration-kind verdict'
    },
    {
      'code': 'type BrandType = { readonly __brand: unique symbol };',
      'errors': [{ 'messageId': 'aliasMustBeInterface' }],
      'name': 'brand alias receives one declaration-kind verdict without a readonly fix',
      'output': null
    },
    {
      'code': 'type ConditionalType<T> = T extends string ? number : boolean;',
      'errors': [{ 'messageId': 'aliasMustBeInterface' }],
      'name': 'conditional computation is a contract or redesign concern'
    },
    {
      'code': 'type MappedType<T> = { [K in keyof T]: T[K] };',
      'errors': [{ 'messageId': 'aliasMustBeInterface' }],
      'name': 'mapped computation is a contract or redesign concern'
    },
    {
      'code': 'class Service {}\ntype ServiceContractType = { service: Service };',
      'errors': [{ 'messageId': 'aliasMustBeInterface' }],
      'name': 'class-bearing alias receives the declaration-kind verdict'
    },
    {
      'code': 'type UnknownContractType = { value: unknown };',
      'errors': [{ 'messageId': 'aliasMustBeInterface' }],
      'name': 'unknown-bearing alias receives the declaration-kind verdict'
    },
    {
      'code': 'type InlineDataType = { value: string };',
      'errors': [{ 'messageId': 'derivedFromSchema' }],
      'name': 'inline pure data must have verified schema provenance'
    },
    {
      'code': [
        '// json-schema-uninexpressible: comments do not change classification',
        'type InlineDataType = { value: string };'
      ].join('\n'),
      'errors': [{ 'messageId': 'derivedFromSchema' }],
      'name': 'comments cannot exempt canonical provenance'
    },
    {
      'code': [
        "import type { ImportedPureDataInterface } from './packages/eslint-config/tests/fixtures/ImportedPureDataInterface.js';",
        'type LocalType = { first: string; second: number };'
      ].join('\n'),
      'errors': [{ 'messageId': 'derivedFromSchema' }],
      'name': 'exact imported shape comparison cannot mask missing schema provenance'
    },
    {
      'code': 'type ListType<T> = Array<T>;',
      'errors': [{ 'messageId': 'genericForwardingAlias' }],
      'name': 'generic forwarding alias receives its deterministic identity verdict'
    },
    {
      'code': 'type AliasType = ExistingType;',
      'errors': [{ 'messageId': 'nakedTypeAlias' }],
      'name': 'naked alias receives its deterministic identity verdict'
    },
    {
      'code': 'type IdType = string;',
      'errors': [{ 'messageId': 'primitiveTypeAlias' }],
      'name': 'primitive forwarding alias receives its deterministic identity verdict'
    },
    {
      'code': "import { FooType as BarType } from './foo.js';",
      'errors': [{ 'messageId': 'importAlias' }],
      'name': 'import aliases cannot hide canonical names'
    },
    {
      'code': [scalarSchemaSource, 'export type Value = FromSchema<typeof ValueSchema>;'].join('\n'),
      'errors': [{ 'messageId': 'mustEndType' }],
      'filename': 'packages/eslint-config/BadName.ts',
      'name': 'retained exported canonical aliases keep deterministic naming'
    },
    {
      'code': [
        scalarSchemaSource,
        'type Value = FromSchema<typeof ValueSchema>;',
        'export type { Value };'
      ].join('\n'),
      'errors': [{ 'messageId': 'mustEndType' }],
      'filename': 'packages/eslint-config/BadReexportName.ts',
      'name': 'separate canonical re-export keeps deterministic naming'
    },
    {
      'code': [entitySource, 'export type ValueListType = readonly ValueType[];'].join('\n'),
      'errors': [{ 'messageId': 'noReadonly' }],
      'filename': 'packages/eslint-config/ReadonlyCollection.ts',
      'name': 'canonical alias readonly output is reported and fixed',
      'output': [entitySource, 'export type ValueListType = ValueType[];'].join('\n')
    },
    {
      'code': [entitySource, 'type ValueListType = ReadonlyArray<ValueType>;'].join('\n'),
      'errors': [{ 'messageId': 'noReadonly' }],
      'filename': 'packages/eslint-config/IntrinsicReadonlyCollection.ts',
      'name': 'intrinsic readonly canonical output is reported without an unsafe fix',
      'output': null
    }
  ]
});

it('exposes no internal rule options or severity controls', () => {
  assert.deepEqual(typeAliasInvariants.meta?.schema, []);
});

it('uses only the outer ESLint severity and enabled state', () => {
  const linter = new Linter();
  const baseConfig = {
    'files': ['**/*.ts'],
    languageOptions,
    'plugins': { 'local': { 'rules': { 'type-alias-invariants': typeAliasInvariants } } }
  };
  const code = 'type HandlerType = () => void;';

  const warning = linter.verify(
    code,
    [{ ...baseConfig, 'rules': { 'local/type-alias-invariants': 'warn' } }],
    { 'filename': 'OuterSeverity.ts' }
  );
  const disabled = linter.verify(
    code,
    [{ ...baseConfig, 'rules': { 'local/type-alias-invariants': 'off' } }],
    { 'filename': 'OuterSeverityOff.ts' }
  );

  assert.equal(warning.length, 1);
  assert.equal(warning.at(0)?.severity, 1);
  assert.deepEqual(disabled, []);
});

it('combined alias and interface rules emit only the interface owner diagnostic', () => {
  const linter = new Linter();
  const messages = linter.verify(
    [
      "import type { ImportedPureDataInterface } from './packages/eslint-config/tests/fixtures/ImportedPureDataInterface.js';",
      'interface LocalPureDataInterface { first: string; second: number; }'
    ].join('\n'),
    [
      {
        'files': ['**/*.ts'],
        languageOptions,
        'plugins': {
          'local': {
            'rules': {
              'interface-must-be-contract': interfaceMustBeContract,
              'type-alias-invariants': typeAliasInvariants
            }
          }
        },
        'rules': {
          'local/interface-must-be-contract': 'error',
          'local/type-alias-invariants': 'error'
        }
      }
    ],
    { 'filename': 'ImportedPureDataInterfaceConsumer.ts' }
  );

  assert.deepEqual(
    messages.map((message) => { return message.messageId; }),
    ['dataShapeMustBeType']
  );
});
