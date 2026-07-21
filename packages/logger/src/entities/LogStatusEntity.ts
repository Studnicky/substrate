import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Universal semantic outcomes for logged operations. */
export namespace LogStatusEntity {
  export const Schema = {
    'description': 'Universal semantic outcome for a logged operation.',
    'enum': [
      'cached', 'complete', 'failed', 'in_progress', 'invalid', 'not_found',
      'partial', 'pending', 'rate_limited', 'retry_exhausted', 'retrying',
      'skipped', 'success', 'timeout', 'unauthorized', 'unavailable'
    ],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
