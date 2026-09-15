import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace SampleBufferStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'isFull': { 'type': 'boolean' },
      'length': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['isFull', 'length'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Observable state exposed by a sample buffer. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
