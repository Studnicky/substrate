import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace ThrottleAbortOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'timeout': { 'minimum': 0, 'type': 'number' }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Grace-period options accepted by {@link Throttle.abort}. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
