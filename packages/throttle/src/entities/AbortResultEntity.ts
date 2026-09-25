import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace AbortResultEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/AbortResult',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Result of an abort operation on a throttle or similar async primitive.',
    'properties': {
      'cancelled': {
        'description': 'Number of operations that were cancelled (both active and queued).',
        'minimum': 0,
        'type': 'integer'
      },
      'completed': {
        'description': 'Number of operations that completed successfully before abort.',
        'minimum': 0,
        'type': 'integer'
      },
      'timedOut': {
        'description': 'Whether the grace period timed out (true) or all operations completed naturally (false). Only relevant when a timeout parameter is provided to abort().',
        'type': 'boolean'
      }
    },
    'required': ['cancelled', 'completed', 'timedOut'],
    'title': 'AbortResult',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/AbortResult', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Result of an abort operation on a throttle or similar async primitive.', 'title': 'AbortResult', 'type': 'object' } as const, { 'cancelled': SchemaNode.defineNumber({
    'description': 'Number of operations that were cancelled (both active and queued).',
    'minimum': 0,
    'type': 'integer'
  } as const), 'completed': SchemaNode.defineNumber({
    'description': 'Number of operations that completed successfully before abort.',
    'minimum': 0,
    'type': 'integer'
  } as const), 'timedOut': SchemaNode.defineBoolean({
    'description': 'Whether the grace period timed out (true) or all operations completed naturally (false). Only relevant when a timeout parameter is provided to abort().',
    'type': 'boolean'
  } as const) }, ['cancelled', 'completed', 'timedOut'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
