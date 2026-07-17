import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

/**
 * Data structure for a normalized error log entry.
 * Root-level fields are indexed by CloudWatch for queries and tables.
 * The context field holds freeform application data as a JSON blob.
 */
export namespace LogFaultDataEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/LogFaultData',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Data structure for a normalized error log entry.',
    'properties': {
      'cause': {
        'description': 'Underlying cause message (for chained errors).',
        'type': 'string'
      },
      'context': {
        'description': 'Freeform application data as a JSON blob.',
        'type': 'object'
      },
      'durationMs': {
        'description': 'Duration in milliseconds.',
        'minimum': 0,
        'type': 'number'
      },
      'event': {
        'description': 'Hierarchical event identifier: component.operation',
        'type': 'string'
      },
      'message': {
        'description': 'Human-readable log message.',
        'type': 'string'
      },
      'name': {
        'description': 'Error name/type.',
        'type': 'string'
      },
      'stack': {
        'description': 'Error stack trace.',
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
    'required': ['context', 'event', 'message', 'name', 'status'],
    'title': 'LogFaultData',
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
