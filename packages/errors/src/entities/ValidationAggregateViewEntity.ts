import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Compact rollup of deduplicated paths and keywords with a total error count. */
export namespace ValidationAggregateViewEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationAggregateView',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'count': { 'type': 'number' },
      'keywords': {
        'items': { 'type': 'string' },
        'type': 'array'
      },
      'paths': {
        'items': { 'type': 'string' },
        'type': 'array'
      }
    },
    'required': ['count', 'keywords', 'paths'],
    'title': 'ValidationAggregateView',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
