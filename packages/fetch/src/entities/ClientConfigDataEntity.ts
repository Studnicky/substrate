import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { DispatcherConfigEntity } from './DispatcherConfigEntity.js';
import { FetchRequestOptionsEntity } from './FetchRequestOptionsEntity.js';
import { QueryParametersEntity } from './QueryParametersEntity.js';

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
      'parameters': QueryParametersEntity.Schema,
      'timeout': { 'exclusiveMinimum': 0, 'multipleOf': 1, 'type': 'number' }
    },
    'title': 'ClientConfigData',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ClientConfigData', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'title': 'ClientConfigData', 'type': 'object' } as const, { 'autoGenerateRequestId': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'baseURL': SchemaNode.defineString({ 'format': 'uri', 'minLength': 1, 'pattern': '^[A-Za-z][A-Za-z0-9+.-]*://.+', 'type': 'string' } as const), 'dispatcher': DispatcherConfigEntity.Node, 'headers': SchemaNode.defineObject({ 'type': 'object' } as const, {  }, [] as const, { 'additionalProperties': false, 'patternProperties': { '^.*$': SchemaNode.defineString({ 'type': 'string' } as const) } }), 'hookTimeoutMs': SchemaNode.defineNumber({ 'exclusiveMinimum': 0, 'type': 'number' } as const), 'metadata': SchemaNode.defineObject({ 'type': 'object' } as const, {  }, [] as const), 'options': SchemaNode.defineAllOf([FetchRequestOptionsEntity.Node, SchemaNode.defineObject({ 'type': 'object' } as const, { 'method': SchemaNode.defineString({ 'pattern': '^(?:[Cc][Oo][Nn][Nn][Ee][Cc][Tt]|[Dd][Ee][Ll][Ee][Tt][Ee]|[Gg][Ee][Tt]|[Hh][Ee][Aa][Dd]|[Oo][Pp][Tt][Ii][Oo][Nn][Ss]|[Pp][Aa][Tt][Cc][Hh]|[Pp][Oo][Ss][Tt]|[Pp][Uu][Tt]|[Tt][Rr][Aa][Cc][Ee])$', 'type': 'string' } as const) }, [] as const)]), 'parameters': QueryParametersEntity.Node, 'timeout': SchemaNode.defineNumber({ 'exclusiveMinimum': 0, 'multipleOf': 1, 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
