import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { ValidationViolationDetailEntity } from './ValidationViolationDetailEntity.js';

/** Construction arguments for `ValidationError`. */
export namespace ValidationErrorArgumentsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationErrorArguments',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'correlationId': {
        'description': 'Optional correlation ID for distributed tracing.',
        'type': 'string'
      },
      'message': {
        'description': 'Human-readable summary of the validation failure.',
        'type': 'string'
      },
      'path': {
        'description': 'JSON Pointer or field name identifying the invalid value.',
        'type': 'string'
      },
      'violations': {
        'description': 'Structured validation violations.',
        'items': ValidationViolationDetailEntity.Schema,
        'type': 'array'
      }
    },
    'required': ['message', 'path'],
    'title': 'ValidationErrorArguments',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
