import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

import { SocketDispatcherStatsEntity } from './SocketDispatcherStatsEntity.js';

/**
 * Dispatcher health assessment result
 * All properties are always present for V8 optimization (consistent hidden class)
 */
export namespace DispatcherHealthEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/DispatcherHealth',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Dispatcher health assessment result',
    'properties': {
      'healthy': {
        'description': 'Whether the dispatcher is healthy (not overloaded)',
        'type': 'boolean'
      },
      'queueRatio': {
        'description': 'Queue ratio: pending requests / connected sockets. Undefined if no dispatcher exists for this origin.',
        'type': 'number'
      },
      'recommendation': {
        'description': 'Recommendation for improving dispatcher health. Undefined if dispatcher is healthy or doesn\'t exist.',
        'type': 'string'
      },
      'stats': SocketDispatcherStatsEntity.Schema
    },
    'required': ['healthy'],
    'title': 'DispatcherHealth',
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
