import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { DEFAULT_DECIMAL_PRECISION, DEFAULT_MAXIMUM_EVENTS } from '../constants/index.js';
import { TimingPrecisionEntity } from './TimingPrecisionEntity.js';

export namespace TimingOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'maximumEvents': {
        'default': DEFAULT_MAXIMUM_EVENTS,
        'description': 'Maximum number of events to store. Positive integer or null (sentinel for Infinity).',
        'oneOf': [
          { 'minimum': 1, 'type': 'integer' },
          { 'type': 'null' }
        ]
      },
      'precision': {
        ...TimingPrecisionEntity.Schema,
        'default': DEFAULT_DECIMAL_PRECISION
      }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
