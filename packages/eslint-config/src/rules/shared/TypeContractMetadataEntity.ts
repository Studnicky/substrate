import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

export namespace TypeContractMetadataEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'aliasClassification': {
        'enum': [
          'interfaceContract',
          'pureDataCanonical',
          'pureDataInvalid',
          'typeFunction'
        ]
      },
      'aliasReason': {
        'enum': [
          'any',
          'bigint',
          'brand',
          'callable',
          'canonicalComposition',
          'classInstance',
          'conditional',
          'constructor',
          'cycle',
          'depth',
          'fromSchema',
          'indexedAccess',
          'inlineObject',
          'interfaceReference',
          'mapped',
          'nakedRename',
          'never',
          'nonJson',
          'primitiveForwarding',
          'symbol',
          'typeParameter',
          'undefined',
          'unknown',
          'unresolvedReference'
        ]
      },
      'canonicalRoot': { 'type': 'boolean' },
      'contractReason': {
        'enum': [
          'any',
          'bigint',
          'brand',
          'callable',
          'classInstance',
          'conditional',
          'constructor',
          'indexedAccess',
          'interfaceReference',
          'mapped',
          'never',
          'nonJson',
          'symbol',
          'undefined',
          'unknown'
        ]
      },
      'fixable': { 'type': 'boolean' },
      'hasCallable': { 'type': 'boolean' },
      'hasData': { 'type': 'boolean' },
      'interfaceClassification': {
        'enum': [
          'contract',
          'pureData'
        ]
      },
      'interfaceContractReason': {
        'enum': [
          'brand',
          'callable',
          'classInstance',
          'constructor',
          'nonJson',
          'readonly'
        ]
      },
      'interfaceReason': {
        'enum': [
          'brand',
          'callable',
          'classInstance',
          'constructor',
          'nonJson',
          'pureData',
          'readonly'
        ]
      },
      'readonlyReason': {
        'enum': [
          'exposedDefault',
          'intrinsicReadonly',
          'readonlyAlias',
          'readonlyArray',
          'readonlyIndex',
          'readonlyMapped',
          'readonlyProperty'
        ]
      },
      'valid': { 'type': 'boolean' }
    },
    'required': [
      'aliasClassification',
      'aliasReason',
      'canonicalRoot',
      'contractReason',
      'fixable',
      'hasCallable',
      'hasData',
      'interfaceClassification',
      'interfaceContractReason',
      'interfaceReason',
      'readonlyReason',
      'valid'
    ],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'aliasClassification': SchemaNode.defineEnum({}, [
    'interfaceContract',
    'pureDataCanonical',
    'pureDataInvalid',
    'typeFunction'
  ] as const), 'aliasReason': SchemaNode.defineEnum({}, [
    'any',
    'bigint',
    'brand',
    'callable',
    'canonicalComposition',
    'classInstance',
    'conditional',
    'constructor',
    'cycle',
    'depth',
    'fromSchema',
    'indexedAccess',
    'inlineObject',
    'interfaceReference',
    'mapped',
    'nakedRename',
    'never',
    'nonJson',
    'primitiveForwarding',
    'symbol',
    'typeParameter',
    'undefined',
    'unknown',
    'unresolvedReference'
  ] as const), 'canonicalRoot': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'contractReason': SchemaNode.defineEnum({}, [
    'any',
    'bigint',
    'brand',
    'callable',
    'classInstance',
    'conditional',
    'constructor',
    'indexedAccess',
    'interfaceReference',
    'mapped',
    'never',
    'nonJson',
    'symbol',
    'undefined',
    'unknown'
  ] as const), 'fixable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'hasCallable': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'hasData': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'interfaceClassification': SchemaNode.defineEnum({}, [
    'contract',
    'pureData'
  ] as const), 'interfaceContractReason': SchemaNode.defineEnum({}, [
    'brand',
    'callable',
    'classInstance',
    'constructor',
    'nonJson',
    'readonly'
  ] as const), 'interfaceReason': SchemaNode.defineEnum({}, [
    'brand',
    'callable',
    'classInstance',
    'constructor',
    'nonJson',
    'pureData',
    'readonly'
  ] as const), 'readonlyReason': SchemaNode.defineEnum({}, [
    'exposedDefault',
    'intrinsicReadonly',
    'readonlyAlias',
    'readonlyArray',
    'readonlyIndex',
    'readonlyMapped',
    'readonlyProperty'
  ] as const), 'valid': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, [
    'aliasClassification',
    'aliasReason',
    'canonicalRoot',
    'contractReason',
    'fixable',
    'hasCallable',
    'hasData',
    'interfaceClassification',
    'interfaceContractReason',
    'interfaceReason',
    'readonlyReason',
    'valid'
  ] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
