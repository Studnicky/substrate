import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/browser';

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
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
