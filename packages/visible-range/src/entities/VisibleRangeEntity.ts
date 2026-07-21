import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace VisibleRangeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'end': { 'type': 'number' },
      'start': { 'type': 'number' }
    },
    'required': ['end', 'start'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Inclusive `[start, end]` index range of currently visible items. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
