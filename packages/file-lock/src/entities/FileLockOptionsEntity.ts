import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { DEFAULT_POLL_MS, DEFAULT_TIMEOUT_MS } from '../constants/FileLockDefaults.js';

export namespace FileLockOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'path': { 'minLength': 1, 'type': 'string' },
      'pollMs': { 'default': DEFAULT_POLL_MS, 'exclusiveMinimum': 0, 'type': 'number' },
      'timeoutMs': { 'default': DEFAULT_TIMEOUT_MS, 'exclusiveMinimum': 0, 'type': 'number' }
    },
    'required': ['path'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
