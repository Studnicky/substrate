import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Overrides applied when generating an RFC 9457 Problem Details payload. */
export namespace ValidationReportOptionsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationReportOptions',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'status': {
        'description': "HTTP status code (defaults to '422').",
        'type': 'number'
      },
      'title': {
        'description': "Human-readable title (defaults to 'Validation failed').",
        'type': 'string'
      },
      'type': {
        'description': "Problem type URI (defaults to 'https://problems.studnicky.dev/validation').",
        'type': 'string'
      }
    },
    'title': 'ValidationReportOptions',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
