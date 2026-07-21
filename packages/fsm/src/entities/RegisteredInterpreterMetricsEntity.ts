import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Schema-derived metrics exposed by a registered interpreter. */
export namespace RegisteredInterpreterMetricsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'hookErrorCount': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['hookErrorCount'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
