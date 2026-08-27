import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Detected shared-prefix/suffix numeric sequence pattern across a set of string values. */
export namespace SequentialPatternResultEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'density': { 'type': 'number' },
      'maximum': { 'type': 'integer' },
      'minimum': { 'type': 'integer' },
      'padding': { 'type': 'integer' },
      'prefix': { 'type': 'string' },
      'suffix': { 'type': 'string' }
    },
    'required': ['density', 'maximum', 'minimum', 'padding', 'prefix', 'suffix'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
