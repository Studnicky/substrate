import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace HealthCheckOptionsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/HealthCheckOptions',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Per-check options accepted by HealthRegistry#register()',
    'properties': {
      'timeoutMs': {
        'description': "Milliseconds allowed for this check to settle before it is treated as 'unhealthy' with timeout metadata. No default — a check with no timeoutMs runs unbounded.",
        'minimum': 0,
        'type': 'integer'
      }
    },
    'title': 'HealthCheckOptions',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
