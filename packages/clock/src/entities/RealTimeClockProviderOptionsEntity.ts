/**
 * Schema-validated options entity for `RealTimeClockProvider`.
 *
 * @module
 */
import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace RealTimeClockProviderOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'offsetMs': { 'default': 0, 'type': 'number' }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Construction options for {@link RealTimeClockProvider}. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
