import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** CircuitBreakerMachine effect: reduce() decided CircuitBreaker.onOpen() must fire (any transition into open). */
export namespace CircuitBreakerOnOpenEffectEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'variant': { 'const': 'onOpen', 'type': 'string' }
    },
    'required': ['variant'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
