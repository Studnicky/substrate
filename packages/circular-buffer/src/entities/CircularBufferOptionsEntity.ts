import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace CircularBufferOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'capacity': { 'minimum': 1, 'type': 'integer' },
      'overflow': { 'enum': ['overwrite', 'grow'], 'type': 'string' }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Construction options for {@link CircularBuffer}. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
