import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { ConfigurationError } from '@studnicky/config';
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

  const compiledValidate = SchemaValidator.compile<Type>(Schema);

  export function validate(candidate: unknown): candidate is Type {
    if (!compiledValidate(candidate)) {
      throw ConfigurationError.create(SchemaValidator.formatErrors(compiledValidate.errors));
    }
    return true;
  }
}
