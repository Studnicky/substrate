import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { ConfigurationError } from '@studnicky/config';
import { SchemaValidator } from '@studnicky/json';

import { ThrottleConfigEntity } from './ThrottleConfigEntity.js';
import { ValidatedAdaptiveConfigEntity } from './ValidatedAdaptiveConfigEntity.js';

/** Fully defaulted configuration retained by a throttle instance. */
export namespace ValidatedThrottleConfigEntity {
  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'adaptive': ValidatedAdaptiveConfigEntity.Schema,
      'concurrencyLimit': ThrottleConfigEntity.Schema.properties.concurrencyLimit
    },
    'required': ['concurrencyLimit'],
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
