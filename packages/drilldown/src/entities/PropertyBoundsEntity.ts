import type { SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Minimum/maximum profile for ordered property types discovered across a record set. */
export namespace PropertyBoundsEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'maximum': { 'type': 'number' },
          'minimum': { 'type': 'number' },
          'type': { 'const': 'number' }
        },
        'required': ['maximum', 'minimum', 'type'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'maximum': { 'type': 'number' },
          'minimum': { 'type': 'number' },
          'type': { 'const': 'date' }
        },
        'required': ['maximum', 'minimum', 'type'],
        'type': 'object'
      }
    ]
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
}
