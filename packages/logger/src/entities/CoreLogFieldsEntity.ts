import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

/**
 * Core fields present on EVERY log record.
 * These enable filtering, correlation, and CloudWatch indexing.
 */
export namespace CoreLogFieldsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/CoreLogFields',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Core log fields present on every normalized log record.',
    'properties': {
      'event': {
        'description': 'Hierarchical event identifier: component.operation',
        'type': 'string'
      },
      'status': {
        'description': 'Operation outcome (semantic, not HTTP-specific)',
        'enum': [
          'cached', 'complete', 'failed', 'in_progress', 'invalid', 'not_found', 'partial',
          'pending', 'rate_limited', 'retry_exhausted', 'retrying', 'skipped', 'success',
          'timeout', 'unauthorized', 'unavailable'
        ],
        'type': 'string'
      }
    },
    'required': ['event', 'status'],
    'title': 'CoreLogFields',
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
