import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { ThrottleConfigEntity } from './ThrottleConfigEntity.js';
import { ValidatedAdaptiveConfigEntity } from './ValidatedAdaptiveConfigEntity.js';

/** Fully defaulted configuration retained by a throttle instance. */
export namespace ValidatedThrottleConfigEntity {
  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'adaptive': ValidatedAdaptiveConfigEntity.Schema,
      'concurrencyLimit': ThrottleConfigEntity.Schema.properties.concurrencyLimit
    },
    'required': ['concurrencyLimit'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
