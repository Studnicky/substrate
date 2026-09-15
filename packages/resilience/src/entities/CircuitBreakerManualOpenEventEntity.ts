import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** `CircuitBreakerMachine` event: caller invoked `forceOpen()`, carrying the clock reading to record as `openedAt`. */
export namespace CircuitBreakerManualOpenEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'at': { 'type': 'number' },
      'type': { 'const': 'manualOpen', 'type': 'string' }
    },
    'required': ['at', 'type'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
