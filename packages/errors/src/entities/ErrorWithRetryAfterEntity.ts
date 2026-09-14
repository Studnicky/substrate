import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Error with retry-after value (typically in seconds). */
export namespace ErrorWithRetryAfterEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithRetryAfter',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': true,
    'properties': {
      'retryAfter': { 'type': 'number' }
    },
    'required': ['retryAfter'],
    'title': 'ErrorWithRetryAfter',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
