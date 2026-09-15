import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Human-readable diagnostic fields exposed by Error-compatible contracts. */
export namespace ErrorDiagnosticEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorDiagnostic',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'message': { 'type': 'string' },
      'name': { 'type': 'string' },
      'stack': { 'type': 'string' }
    },
    'required': ['message', 'name'],
    'title': 'ErrorDiagnostic',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
