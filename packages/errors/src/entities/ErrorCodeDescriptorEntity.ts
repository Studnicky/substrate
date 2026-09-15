import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Describes a registered error code entry in `ErrorCodeRegistry`. */
export namespace ErrorCodeDescriptorEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorCodeDescriptor',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'code': {
        'description': "Dotted camelCase error code (e.g. 'errors.validationFailed').",
        'type': 'string'
      },
      'description': {
        'description': 'Human-readable description of what this code represents.',
        'type': 'string'
      },
      'retryable': {
        'description': 'Whether errors with this code should be retried.',
        'type': 'boolean'
      }
    },
    'required': ['code', 'description', 'retryable'],
    'title': 'ErrorCodeDescriptor',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
