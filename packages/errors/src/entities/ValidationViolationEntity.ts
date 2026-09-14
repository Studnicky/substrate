import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Describes one validation failure from a schema check. */
export namespace ValidationViolationEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationViolation',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'keyword': {
        'description': "Validation keyword that triggered the failure (e.g. 'required', 'minLength').",
        'type': 'string'
      },
      'message': {
        'description': 'Human-readable description of the failure.',
        'type': 'string'
      },
      'path': {
        'description': "JSON Pointer or field name of the failing field (e.g. '/user/email').",
        'type': 'string'
      }
    },
    'required': ['keyword', 'message', 'path'],
    'title': 'ValidationViolation',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
