import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

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

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
