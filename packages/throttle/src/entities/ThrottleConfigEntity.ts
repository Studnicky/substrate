import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { AdaptiveConfigEntity } from './AdaptiveConfigEntity.js';

export namespace ThrottleConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'adaptive': {
        ...AdaptiveConfigEntity.Schema,
        'description': 'Adaptive concurrency configuration.'
      },
      'concurrencyLimit': {
        'description': 'Maximum number of concurrent operations.',
        'minimum': 1,
        'type': 'integer'
      }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
