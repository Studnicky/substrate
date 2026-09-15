import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** `CircuitBreakerMachine` state: calls pass through; counts consecutive failures. */
export namespace CircuitBreakerClosedStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'failureCount': { 'minimum': 0, 'type': 'integer' },
      'variant': { 'const': 'closed', 'type': 'string' }
    },
    'required': ['failureCount', 'variant'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
