import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

export namespace SlidingWindowLimiterOptionsEntity {
  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'algorithm': { 'enum': ['log', 'counter'], 'type': 'string' },
      'limit': { 'minimum': 1, 'type': 'integer' },
      'windowMs': { 'exclusiveMinimum': 0, 'type': 'number' }
    },
    'required': ['limit', 'windowMs', 'algorithm'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$schema': 'https://json-schema.org/draft/2020-12/schema', 'type': 'object' } as const, { 'algorithm': SchemaNode.defineEnum({}, ['log', 'counter'] as const), 'limit': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'windowMs': SchemaNode.defineNumber({ 'exclusiveMinimum': 0, 'type': 'number' } as const) }, ['limit', 'windowMs', 'algorithm'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
