import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace BusQueueOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'highWaterMark': { 'minimum': 1, 'type': 'integer' }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  /** JSON-serializable options for BusQueue construction. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
