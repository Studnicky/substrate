import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace VisibleRangeConfigDataEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'count': { 'minimum': 0, 'type': 'integer' },
      'itemSize': { 'exclusiveMinimum': 0, 'type': 'number' },
      'overscan': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['count'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Serializable inputs accepted by visible-range configuration. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
