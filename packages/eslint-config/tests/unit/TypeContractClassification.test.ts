import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

import {
  createCompilerHost,
  createProgram,
  createSourceFile,
  type CompilerHost,
  type CompilerOptions,
  isInterfaceDeclaration,
  isModuleBlock,
  isModuleDeclaration,
  isTypeAliasDeclaration,
  ModuleKind,
  ModuleResolutionKind,
  type Program,
  ScriptKind,
  ScriptTarget,
  type SourceFile
} from 'typescript';

import { TypeContractClassification } from '../../src/rules/shared/TypeContractClassification.js';

const packageRoot = resolve(import.meta.dirname, '../..');
const virtualRoot = resolve(packageRoot, '.type-contract-classification');

const compilerOptions: CompilerOptions = {
  'allowImportingTsExtensions': true,
  'module': ModuleKind.NodeNext,
  'moduleResolution': ModuleResolutionKind.NodeNext,
  'skipLibCheck': true,
  'strict': true,
  'target': ScriptTarget.ESNext
};

const canonicalSource = [
  "import type { FromSchema, JSONSchema } from 'json-schema-to-ts';",
  'export const CanonicalSchema = {',
  "  additionalProperties: false,",
  "  properties: { id: { type: 'string' } },",
  "  required: ['id'],",
  "  type: 'object'",
  '} as const satisfies JSONSchema;',
  'export type CanonicalType = FromSchema<typeof CanonicalSchema>;',
  'export type ImportedReadonlyType = readonly CanonicalType[];'
].join('\n');

function createFixture(sources: ReadonlyMap<string, string>): Program {
  const files = new Map<string, string>();
  sources.forEach((source, filename) => {
    files.set(resolve(virtualRoot, filename), source);
  });

  const baseHost = createCompilerHost(compilerOptions);
  const host: CompilerHost = {
    ...baseHost,
    'directoryExists': (directory) => {
      const normalized = resolve(directory);
      const virtualDirectory = [...files.keys()].some((filename) => {
        return filename.startsWith(`${normalized}/`);
      });
      return virtualDirectory || baseHost.directoryExists?.(directory) === true;
    },
    'fileExists': (filename) => {
      return files.has(resolve(filename)) || baseHost.fileExists(filename);
    },
    'getSourceFile': (filename, languageVersion, onError, shouldCreateNewSourceFile) => {
      const source = files.get(resolve(filename));
      if (source !== undefined) {
        return createSourceFile(filename, source, languageVersion, true, ScriptKind.TS);
      }
      return baseHost.getSourceFile(filename, languageVersion, onError, shouldCreateNewSourceFile);
    },
    'readFile': (filename) => {
      return files.get(resolve(filename)) ?? baseHost.readFile(filename);
    }
  };

  return createProgram({
    'host': host,
    'options': compilerOptions,
    'rootNames': [...files.keys()]
  });
}

function sourceFile(program: Program, filename = 'root.ts'): SourceFile {
  const source = program.getSourceFile(resolve(virtualRoot, filename));
  if (source === undefined) { throw new Error(`Missing fixture source: ${filename}`); }
  return source;
}

function alias(program: Program, name: string, filename = 'root.ts') {
  const declaration = sourceFile(program, filename).statements.find((statement) => {
    return isTypeAliasDeclaration(statement) && statement.name.text === name;
  });
  if (declaration === undefined || !isTypeAliasDeclaration(declaration)) {
    throw new Error(`Missing type alias: ${name}`);
  }
  return declaration;
}

function interfaceDeclaration(program: Program, name: string) {
  const declaration = sourceFile(program).statements.find((statement) => {
    return isInterfaceDeclaration(statement) && statement.name.text === name;
  });
  if (declaration === undefined || !isInterfaceDeclaration(declaration)) {
    throw new Error(`Missing interface: ${name}`);
  }
  return declaration;
}

function withCanonical(rootSource: string): Program {
  return createFixture(new Map([
    ['canonical.ts', canonicalSource],
    ['root.ts', rootSource]
  ]));
}

describe('TypeContractClassification', () => {
  it('recognizes direct FromSchema provenance inside an entity namespace', () => {
    const program = createFixture(new Map([
      ['root.ts', [
        "import type { FromSchema, JSONSchema } from 'json-schema-to-ts';",
        'export namespace UserEntity {',
        "  export const Schema = { type: 'string' } as const satisfies JSONSchema;",
        '  export type Type = FromSchema<typeof Schema>;',
        '}'
      ].join('\n')]
    ]));
    const namespaceDeclaration = sourceFile(program).statements.find(isModuleDeclaration);
    const namespaceBody = namespaceDeclaration?.body;
    if (namespaceBody === undefined || !isModuleBlock(namespaceBody)) {
      throw new Error('Missing entity namespace body');
    }
    const typeDeclaration = namespaceBody.statements.find(isTypeAliasDeclaration);
    if (typeDeclaration === undefined) { throw new Error('Missing entity Type declaration'); }

    const analysis = TypeContractClassification.forProgram(program).analyzeAlias(typeDeclaration);
    assert.equal(analysis.classification, 'pureDataCanonical');
    assert.equal(analysis.reason, 'fromSchema');
  });

  it('verifies local FromSchema roots and imported canonical composition provenance', () => {
    const program = withCanonical([
      "import type { FromSchema, JSONSchema as SchemaConstraint } from 'json-schema-to-ts';",
      "import { CanonicalSchema as RenamedSchema } from './canonical.ts';",
      "import type { CanonicalType } from './canonical.ts';",
      "import * as Canonical from './canonical.ts';",
      "const LocalSchema = { type: 'string' } as const satisfies SchemaConstraint;",
      'type LocalType = FromSchema<typeof LocalSchema>;',
      'type RenamedSchemaType = FromSchema<typeof RenamedSchema>;',
      'type NamespaceSchemaType = FromSchema<typeof Canonical.CanonicalSchema>;',
      'type LocalCompositionType = LocalType[];',
      'type ImportedCompositionType = CanonicalType | null;'
    ].join('\n'));
    const classification = TypeContractClassification.forProgram(program);

    assert.equal(classification.analyzeAlias(alias(program, 'LocalType')).classification, 'pureDataCanonical');
    assert.equal(classification.analyzeAlias(alias(program, 'LocalType')).reason, 'fromSchema');
    assert.equal(
      classification.analyzeAlias(alias(program, 'RenamedSchemaType')).classification,
      'pureDataCanonical'
    );
    assert.equal(
      classification.analyzeAlias(alias(program, 'NamespaceSchemaType')).classification,
      'pureDataCanonical'
    );
    assert.equal(
      classification.analyzeAlias(alias(program, 'LocalCompositionType')).classification,
      'pureDataCanonical'
    );
    assert.equal(
      classification.analyzeAlias(alias(program, 'ImportedCompositionType')).classification,
      'pureDataCanonical'
    );
    assert.equal(TypeContractClassification.forProgram(program), classification);
  });

  it('requires owner-direct FromSchema and JSONSchema while preserving aliases and namespaces', () => {
    const program = createFixture(new Map([
      ['proxy.ts', "export type { FromSchema, JSONSchema } from 'json-schema-to-ts';"],
      ['root.ts', [
        "import type { FromSchema as DirectFromSchema, JSONSchema as DirectJSONSchema } from 'json-schema-to-ts';",
        "import type { FromSchema as ProxyFromSchema, JSONSchema as ProxyJSONSchema } from './proxy.ts';",
        "import type * as JsonSchema from 'json-schema-to-ts';",
        "import type * as ProxySchema from './proxy.ts';",
        'type FromSchema<T> = T;',
        "type JSONSchema = { readonly type: 'string' };",
        "const DirectSchema = { type: 'string' } as const satisfies DirectJSONSchema;",
        "const NamespaceSchema = { type: 'string' } as const satisfies JsonSchema.JSONSchema;",
        "const ProxyConstrainedSchema = { type: 'string' } as const satisfies ProxyJSONSchema;",
        "const ProxyNamespaceSchema = { type: 'string' } as const satisfies ProxySchema.JSONSchema;",
        "const ShadowedSchema = { type: 'string' } as const satisfies JSONSchema;",
        "const MutableConstrainedSchema = { type: 'string' } satisfies DirectJSONSchema;",
        "const UnconstrainedSchema = { type: 'string' } as const;",
        'type DirectType = DirectFromSchema<typeof DirectSchema>;',
        'type DirectNamespaceType = JsonSchema.FromSchema<typeof NamespaceSchema>;',
        'type ProxyType = ProxyFromSchema<typeof DirectSchema>;',
        'type ProxyNamespaceType = ProxySchema.FromSchema<typeof DirectSchema>;',
        'type ProxyConstraintType = DirectFromSchema<typeof ProxyConstrainedSchema>;',
        'type ProxyNamespaceConstraintType = DirectFromSchema<typeof ProxyNamespaceSchema>;',
        'type ShadowedFromSchemaType = FromSchema<typeof DirectSchema>;',
        'type ShadowedJSONSchemaType = DirectFromSchema<typeof ShadowedSchema>;',
        'type MutableConstraintType = DirectFromSchema<typeof MutableConstrainedSchema>;',
        'type UnconstrainedType = DirectFromSchema<typeof UnconstrainedSchema>;',
        "type InlineSchemaType = DirectFromSchema<{ readonly type: 'string' }>;"
      ].join('\n')]
    ]));
    const classification = TypeContractClassification.forProgram(program);
    const direct = classification.analyzeAlias(alias(program, 'DirectType'));
    const directNamespace = classification.analyzeAlias(alias(program, 'DirectNamespaceType'));
    const proxy = classification.analyzeAlias(alias(program, 'ProxyType'));
    const proxyNamespace = classification.analyzeAlias(alias(program, 'ProxyNamespaceType'));
    const proxyConstraint = classification.analyzeAlias(alias(program, 'ProxyConstraintType'));
    const proxyNamespaceConstraint = classification.analyzeAlias(alias(program, 'ProxyNamespaceConstraintType'));
    const shadowedFromSchema = classification.analyzeAlias(alias(program, 'ShadowedFromSchemaType'));
    const shadowedJSONSchema = classification.analyzeAlias(alias(program, 'ShadowedJSONSchemaType'));
    const mutableConstraint = classification.analyzeAlias(alias(program, 'MutableConstraintType'));
    const unconstrained = classification.analyzeAlias(alias(program, 'UnconstrainedType'));
    const inline = classification.analyzeAlias(alias(program, 'InlineSchemaType'));

    assert.equal(direct.classification, 'pureDataCanonical');
    assert.equal(direct.reason, 'fromSchema');
    assert.equal(directNamespace.classification, 'pureDataCanonical');
    assert.equal(directNamespace.reason, 'fromSchema');
    assert.equal(proxy.classification, 'pureDataInvalid');
    assert.equal(proxy.reason, 'unresolvedReference');
    assert.equal(proxyNamespace.classification, 'pureDataInvalid');
    assert.equal(proxyNamespace.reason, 'unresolvedReference');
    assert.equal(proxyConstraint.classification, 'pureDataInvalid');
    assert.equal(proxyConstraint.reason, 'unresolvedReference');
    assert.equal(proxyNamespaceConstraint.classification, 'pureDataInvalid');
    assert.equal(proxyNamespaceConstraint.reason, 'unresolvedReference');
    assert.equal(shadowedFromSchema.classification, 'pureDataInvalid');
    assert.equal(shadowedFromSchema.reason, 'unresolvedReference');
    assert.equal(shadowedJSONSchema.classification, 'pureDataInvalid');
    assert.equal(shadowedJSONSchema.reason, 'unresolvedReference');
    assert.equal(mutableConstraint.classification, 'pureDataInvalid');
    assert.equal(mutableConstraint.reason, 'unresolvedReference');
    assert.equal(unconstrained.classification, 'pureDataInvalid');
    assert.equal(unconstrained.reason, 'unresolvedReference');
    assert.equal(inline.classification, 'pureDataInvalid');
    assert.equal(inline.reason, 'unresolvedReference');
  });

  it('returns each alias classification with evidence and terminates alias cycles', () => {
    const program = withCanonical([
      "import type { CanonicalType } from './canonical.ts';",
      'type CanonicalCompositionType = CanonicalType[];',
      'type InvalidDataType = { id: string };',
      'type CallableContractType = (id: string) => void;',
      'type IndexedUnknownType = { [key: string]: unknown };',
      'type CycleAType = CycleBType[];',
      'type CycleBType = CycleAType[];'
    ].join('\n'));
    const classification = TypeContractClassification.forProgram(program);
    const canonical = classification.analyzeAlias(alias(program, 'CanonicalCompositionType'));
    const invalid = classification.analyzeAlias(alias(program, 'InvalidDataType'));
    const contract = classification.analyzeAlias(alias(program, 'CallableContractType'));
    const indexedUnknown = classification.analyzeAlias(alias(program, 'IndexedUnknownType'));
    const cycle = classification.analyzeAlias(alias(program, 'CycleAType'));

    assert.equal(canonical.classification, 'pureDataCanonical');
    assert.equal(canonical.reason, 'canonicalComposition');
    assert.ok(canonical.evidence.pos >= 0);
    assert.equal(invalid.classification, 'pureDataInvalid');
    assert.equal(invalid.reason, 'inlineObject');
    assert.ok(invalid.evidence.pos >= 0);
    assert.equal(contract.classification, 'interfaceContract');
    assert.equal(contract.reason, 'callable');
    assert.ok(contract.evidence.pos >= 0);
    assert.equal(indexedUnknown.classification, 'interfaceContract');
    assert.equal(indexedUnknown.reason, 'unknown');
    assert.equal(cycle.classification, 'pureDataInvalid');
    assert.equal(cycle.reason, 'cycle');
  });

  it('distinguishes TypeScript readonly intrinsics from shadowed utility names', () => {
    const intrinsicProgram = withCanonical([
      "import type { CanonicalType } from './canonical.ts';",
      'type IntrinsicReadonlyType = Readonly<CanonicalType>;',
      'type IntrinsicArrayType = ReadonlyArray<CanonicalType>;'
    ].join('\n'));
    const shadowedProgram = withCanonical([
      "import type { CanonicalType } from './canonical.ts';",
      'type Readonly<T> = T;',
      'type ShadowedType = Readonly<CanonicalType>;'
    ].join('\n'));
    const intrinsicClassification = TypeContractClassification.forProgram(intrinsicProgram);
    const shadowedClassification = TypeContractClassification.forProgram(shadowedProgram);
    const intrinsicReadonly = intrinsicClassification.analyzeAlias(alias(intrinsicProgram, 'IntrinsicReadonlyType'));
    const intrinsicArray = intrinsicClassification.analyzeAlias(alias(intrinsicProgram, 'IntrinsicArrayType'));
    const shadowed = shadowedClassification.analyzeAlias(alias(shadowedProgram, 'ShadowedType'));

    assert.equal(intrinsicReadonly.classification, 'pureDataCanonical');
    assert.deepEqual(intrinsicReadonly.readonlyOutput.map((evidence) => { return evidence.reason; }), ['intrinsicReadonly']);
    assert.equal(intrinsicReadonly.readonlyOutput[0]?.fixable, false);
    assert.equal(intrinsicArray.classification, 'pureDataCanonical');
    assert.deepEqual(intrinsicArray.readonlyOutput.map((evidence) => { return evidence.reason; }), ['intrinsicReadonly']);
    assert.equal(shadowed.readonlyOutput.length, 0);
  });

  it('identifies explicit readonly syntax only in output roles', () => {
    const program = withCanonical([
      "import type { CanonicalType } from './canonical.ts';",
      'type ReadonlyPropertyType = { readonly value: CanonicalType };',
      'type ReadonlyIndexType = { readonly [key: string]: CanonicalType };',
      'type ReadonlyMappedType<T> = { +readonly [K in keyof T]: CanonicalType };'
    ].join('\n'));
    const classification = TypeContractClassification.forProgram(program);

    const explicitCases = new Map([
      ['ReadonlyPropertyType', 'readonlyProperty'],
      ['ReadonlyIndexType', 'readonlyIndex'],
      ['ReadonlyMappedType', 'readonlyMapped']
    ]);
    explicitCases.forEach((reason, name) => {
      const evidence = classification.analyzeAlias(alias(program, name)).readonlyOutput;
      assert.deepEqual(evidence.map((entry) => { return entry.reason; }), [reason], name);
      assert.equal(evidence[0]?.fixable, true, name);
    });
  });

  it('reports readonly defaults only when their parameter is exposed in output', () => {
    const program = withCanonical([
      "import type { CanonicalType } from './canonical.ts';",
      'type ExposedDefaultType<T = ReadonlyArray<CanonicalType>> = T;',
      'type UnusedDefaultType<T = ReadonlyArray<CanonicalType>> = CanonicalType[];'
    ].join('\n'));
    const classification = TypeContractClassification.forProgram(program);
    const exposed = classification.analyzeAlias(alias(program, 'ExposedDefaultType'));
    const unused = classification.analyzeAlias(alias(program, 'UnusedDefaultType'));

    assert.deepEqual(exposed.readonlyOutput.map((evidence) => { return evidence.reason; }), ['exposedDefault']);
    assert.equal(exposed.readonlyOutput[0]?.fixable, false);
    assert.equal(unused.readonlyOutput.length, 0);
  });

  it('excludes input and inspection roles while retaining result output roles', () => {
    const program = withCanonical([
      "import type { CanonicalType } from './canonical.ts';",
      'type ConstraintType<T extends readonly CanonicalType[]> = CanonicalType[];',
      'type ConditionalInspectType<T> = T extends readonly CanonicalType[] ? CanonicalType[] : CanonicalType[];',
      'type CallableInputType = (input: readonly CanonicalType[]) => CanonicalType[];',
      'type KeyofInspectType = keyof Readonly<CanonicalType>;',
      "type IndexedInspectType = Readonly<CanonicalType>['id'];",
      'type MappedRemovalType<T> = { -readonly [K in keyof T]: CanonicalType };',
      'type ConditionalOutputType<T> = T extends string ? readonly CanonicalType[] : CanonicalType[];',
      'type CallableOutputType = () => readonly CanonicalType[];'
    ].join('\n'));
    const classification = TypeContractClassification.forProgram(program);
    const excluded = [
      'ConstraintType',
      'ConditionalInspectType',
      'CallableInputType',
      'KeyofInspectType',
      'IndexedInspectType',
      'MappedRemovalType'
    ];

    excluded.forEach((name) => {
      assert.equal(classification.analyzeAlias(alias(program, name)).readonlyOutput.length, 0, name);
    });
    assert.deepEqual(
      classification.analyzeAlias(alias(program, 'ConditionalOutputType')).readonlyOutput.map((evidence) => {
        return evidence.reason;
      }),
      ['readonlyArray']
    );
    assert.deepEqual(
      classification.analyzeAlias(alias(program, 'CallableOutputType')).readonlyOutput.map((evidence) => {
        return evidence.reason;
      }),
      ['readonlyArray']
    );
  });

  it('follows local and imported readonly alias indirection at the reference site', () => {
    const program = withCanonical([
      "import type { CanonicalType, ImportedReadonlyType } from './canonical.ts';",
      'type LocalReadonlyType = readonly CanonicalType[];',
      'type LocalCompositionType = LocalReadonlyType | CanonicalType;',
      'type ImportedCompositionType = ImportedReadonlyType | CanonicalType;'
    ].join('\n'));
    const classification = TypeContractClassification.forProgram(program);
    const local = classification.analyzeAlias(alias(program, 'LocalCompositionType'));
    const imported = classification.analyzeAlias(alias(program, 'ImportedCompositionType'));

    assert.deepEqual(local.readonlyOutput.map((evidence) => { return evidence.reason; }), ['readonlyAlias']);
    assert.equal(local.readonlyOutput[0]?.fixable, false);
    assert.deepEqual(imported.readonlyOutput.map((evidence) => { return evidence.reason; }), ['readonlyAlias']);
    assert.equal(imported.readonlyOutput[0]?.fixable, false);
  });

  it('classifies pure-data and readonly, callable, constructor, class, brand, and non-JSON interfaces', () => {
    const program = createFixture(new Map([
      ['root.ts', [
        'class Service {}',
        'interface EmptyInterface {}',
        'interface PureInterface { value: string }',
        'interface ReadonlyInterface { readonly value: string }',
        'interface CallableInterface { (value: string): void }',
        'interface ConstructorInterface { new (value: string): object }',
        'interface ClassInterface { service: Service }',
        'interface BrandInterface { readonly __brand: unique symbol }',
        'interface NonJsonInterface { value: unknown }',
        'interface NestedNonJsonInterface { value: { nested: unknown } }',
        'interface RecursivePureInterface { next?: RecursivePureInterface }',
        'interface NamedCallableInterface { (value: string): void }',
        'interface NamedCallableOwnerInterface { handler: NamedCallableInterface }',
        'interface NamedPureDataInterface { value: string }',
        'interface NamedPureDataOwnerInterface { data: NamedPureDataInterface }',
        'interface CallableValuePureDataInterface { value: string }',
        'declare const CallableValuePureDataInterface: () => CallableValuePureDataInterface;',
        'interface CallableValuePureDataOwnerInterface { data: CallableValuePureDataInterface }',
        'interface RegExpOwnerInterface { value: RegExp }',
        'interface ErrorOwnerInterface { value: Error }',
        'interface AbortSignalOwnerInterface { value: AbortSignal }',
        'interface Uint8ArrayOwnerInterface { value: Uint8Array }',
        'interface ArrayBufferOwnerInterface { value: ArrayBuffer }',
        'interface UrlOwnerInterface { value: URL }',
        'type DirectPureInterfaceAliasType = PureInterface;',
        'type NestedPureInterfaceAliasType = PureInterface[];',
        'type DirectContractInterfaceAliasType = ReadonlyInterface;',
        'type NestedContractInterfaceAliasType = CallableInterface[];',
        'type RecursivePureInterfaceAliasType = RecursivePureInterface;'
      ].join('\n')]
    ]));
    const classification = TypeContractClassification.forProgram(program);

    assert.equal(classification.analyzeInterface(interfaceDeclaration(program, 'EmptyInterface')).classification, 'pureData');
    assert.equal(classification.analyzeInterface(interfaceDeclaration(program, 'PureInterface')).classification, 'pureData');
    assert.equal(classification.analyzeInterface(interfaceDeclaration(program, 'ReadonlyInterface')).reason, 'readonly');
    assert.equal(classification.analyzeInterface(interfaceDeclaration(program, 'CallableInterface')).reason, 'callable');
    assert.equal(classification.analyzeInterface(interfaceDeclaration(program, 'ConstructorInterface')).reason, 'constructor');
    assert.equal(classification.analyzeInterface(interfaceDeclaration(program, 'ClassInterface')).reason, 'classInstance');
    assert.equal(classification.analyzeInterface(interfaceDeclaration(program, 'BrandInterface')).reason, 'brand');
    assert.equal(classification.analyzeInterface(interfaceDeclaration(program, 'NonJsonInterface')).reason, 'nonJson');
    assert.equal(
      classification.analyzeInterface(interfaceDeclaration(program, 'NestedNonJsonInterface')).reason,
      'nonJson'
    );
    assert.equal(
      classification.analyzeInterface(interfaceDeclaration(program, 'RecursivePureInterface')).classification,
      'pureData'
    );
    assert.equal(
      classification.analyzeInterface(interfaceDeclaration(program, 'NamedCallableOwnerInterface')).reason,
      'callable'
    );
    assert.equal(
      classification.analyzeInterface(interfaceDeclaration(program, 'NamedPureDataOwnerInterface')).classification,
      'pureData'
    );
    assert.equal(
      classification.analyzeInterface(interfaceDeclaration(program, 'CallableValuePureDataOwnerInterface')).classification,
      'pureData'
    );

    const runtimeProviders = [
      'RegExpOwnerInterface',
      'ErrorOwnerInterface',
      'AbortSignalOwnerInterface',
      'Uint8ArrayOwnerInterface',
      'ArrayBufferOwnerInterface',
      'UrlOwnerInterface'
    ];
    runtimeProviders.forEach((name) => {
      assert.equal(classification.analyzeInterface(interfaceDeclaration(program, name)).reason, 'classInstance', name);
    });

    const directPure = classification.analyzeAlias(alias(program, 'DirectPureInterfaceAliasType'));
    const nestedPure = classification.analyzeAlias(alias(program, 'NestedPureInterfaceAliasType'));
    const directContract = classification.analyzeAlias(alias(program, 'DirectContractInterfaceAliasType'));
    const nestedContract = classification.analyzeAlias(alias(program, 'NestedContractInterfaceAliasType'));
    const recursivePure = classification.analyzeAlias(alias(program, 'RecursivePureInterfaceAliasType'));

    assert.equal(directPure.classification, 'pureDataInvalid');
    assert.equal(directPure.reason, 'interfaceReference');
    assert.equal(nestedPure.classification, 'pureDataInvalid');
    assert.equal(nestedPure.reason, 'interfaceReference');
    assert.equal(directContract.classification, 'interfaceContract');
    assert.equal(directContract.reason, 'interfaceReference');
    assert.equal(directContract.readonlyOutput.length, 0);
    assert.equal(nestedContract.classification, 'interfaceContract');
    assert.equal(nestedContract.reason, 'interfaceReference');
    assert.equal(recursivePure.classification, 'pureDataInvalid');
    assert.equal(recursivePure.reason, 'interfaceReference');
  });
});
