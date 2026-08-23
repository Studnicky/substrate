import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Construction options for `CircuitBreakerMachine` — the resolved (defaulted) thresholds. */
export namespace CircuitBreakerMachineOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'failureThreshold': { 'minimum': 1, 'type': 'integer' },
      'successThreshold': { 'minimum': 1, 'type': 'integer' }
    },
    'required': ['failureThreshold', 'successThreshold'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
