import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { DispatcherConfigEntity } from './DispatcherConfigEntity.js';
import { FetchRequestOptionsEntity } from './FetchRequestOptionsEntity.js';

export namespace ClientConfigDataEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ClientConfigData',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'autoGenerateRequestId': { 'type': 'boolean' },
      'baseURL': { 'format': 'uri', 'minLength': 1, 'pattern': '^[A-Za-z][A-Za-z0-9+.-]*://.+', 'type': 'string' },
      'dispatcher': DispatcherConfigEntity.Schema,
      'headers': {
        'additionalProperties': false,
        'patternProperties': { '^.*$': { 'type': 'string' } },
        'type': 'object'
      },
      'hookTimeoutMs': { 'exclusiveMinimum': 0, 'type': 'number' },
      'metadata': { 'type': 'object' },
      'options': {
        'allOf': [
          FetchRequestOptionsEntity.Schema,
          {
            'properties': {
              'method': { 'pattern': '^(?:[Cc][Oo][Nn][Nn][Ee][Cc][Tt]|[Dd][Ee][Ll][Ee][Tt][Ee]|[Gg][Ee][Tt]|[Hh][Ee][Aa][Dd]|[Oo][Pp][Tt][Ii][Oo][Nn][Ss]|[Pp][Aa][Tt][Cc][Hh]|[Pp][Oo][Ss][Tt]|[Pp][Uu][Tt]|[Tt][Rr][Aa][Cc][Ee])$', 'type': 'string' }
            },
            'type': 'object'
          }
        ]
      },
      'parameters': {
        'additionalProperties': false,
        'patternProperties': {
          '^.*$': {
            'anyOf': [
              { 'type': ['boolean', 'null', 'number', 'string'] },
              {
                'items': { 'type': ['boolean', 'null', 'number', 'string'] },
                'type': 'array'
              }
            ]
          }
        },
        'type': 'object'
      },
      'timeout': { 'exclusiveMinimum': 0, 'type': 'number' }
    },
    'title': 'ClientConfigData',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
