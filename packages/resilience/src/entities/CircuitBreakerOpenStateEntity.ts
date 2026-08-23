import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** `CircuitBreakerMachine` state: calls fast-fail until `resetTimeoutMs` elapses. */
export namespace CircuitBreakerOpenStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'openedAt': { 'type': 'number' },
      'variant': { 'const': 'open', 'type': 'string' }
    },
    'required': ['openedAt', 'variant'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
