import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

/**
 * Single client statistics (for non-dispatcher connections)
 */
export namespace SocketClientStatsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/SocketClientStats',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Single client statistics (for non-dispatcher connections)',
    'properties': {
      'connected': {
        'description': 'Whether the socket has an open connection',
        'type': 'boolean'
      },
      'pending': {
        'description': 'Number of open connections without active requests',
        'minimum': 0,
        'type': 'integer'
      },
      'running': {
        'description': 'Number of currently active requests',
        'minimum': 0,
        'type': 'integer'
      },
      'size': {
        'description': 'Total number of active, pending, or queued requests',
        'minimum': 0,
        'type': 'integer'
      }
    },
    'required': ['connected', 'pending', 'running', 'size'],
    'title': 'SocketClientStats',
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
