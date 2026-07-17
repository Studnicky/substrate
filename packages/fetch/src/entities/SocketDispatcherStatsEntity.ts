import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

/**
 * Socket dispatcher statistics for connection monitoring
 * Represents stats for a single origin (host:port)
 */
export namespace SocketDispatcherStatsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/SocketDispatcherStats',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Socket dispatcher statistics for a single origin',
    'properties': {
      'connected': {
        'description': 'Number of open socket connections',
        'minimum': 0,
        'type': 'integer'
      },
      'free': {
        'description': 'Number of open connections without active requests',
        'minimum': 0,
        'type': 'integer'
      },
      'pending': {
        'description': 'Number of pending requests waiting for a connection',
        'minimum': 0,
        'type': 'integer'
      },
      'queued': {
        'description': 'Number of queued requests',
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
    'required': ['connected', 'free', 'pending', 'queued', 'running', 'size'],
    'title': 'SocketDispatcherStats',
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
