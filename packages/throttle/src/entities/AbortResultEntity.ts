import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace AbortResultEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/AbortResult',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Result of an abort operation on a throttle or similar async primitive.',
    'properties': {
      'cancelled': {
        'description': 'Number of operations that were cancelled (both active and queued).',
        'minimum': 0,
        'type': 'integer'
      },
      'completed': {
        'description': 'Number of operations that completed successfully before abort.',
        'minimum': 0,
        'type': 'integer'
      },
      'timedOut': {
        'description': 'Whether the grace period timed out (true) or all operations completed naturally (false). Only relevant when a timeout parameter is provided to abort().',
        'type': 'boolean'
      }
    },
    'required': ['cancelled', 'completed', 'timedOut'],
    'title': 'AbortResult',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
