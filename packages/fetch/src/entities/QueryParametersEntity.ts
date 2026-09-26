import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** URL query parameters represented as JSON scalar values or arrays of JSON scalar values. */
export namespace QueryParametersEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/QueryParameters',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': {
      'anyOf': [
        { 'type': ['boolean', 'null', 'number', 'string'] },
        {
          'items': { 'type': ['boolean', 'null', 'number', 'string'] },
          'type': 'array'
        }
      ]
    },
    'description': 'URL query parameters represented as JSON scalar values or arrays of JSON scalar values',
    'title': 'QueryParameters',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/QueryParameters', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'URL query parameters represented as JSON scalar values or arrays of JSON scalar values', 'title': 'QueryParameters', 'type': 'object' } as const, {  }, [] as const, { 'additionalProperties': SchemaNode.defineAnyOf({}, [SchemaNode.defineAnyOf({}, [SchemaNode.defineBoolean({ 'type': 'boolean' } as const), SchemaNode.defineNull({ 'type': 'null' } as const), SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineString({ 'type': 'string' } as const)]), SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineAnyOf({}, [SchemaNode.defineBoolean({ 'type': 'boolean' } as const), SchemaNode.defineNull({ 'type': 'null' } as const), SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineString({ 'type': 'string' } as const)]), undefined)]), 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
