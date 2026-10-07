import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

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
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/SocketDispatcherStats', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Socket dispatcher statistics for a single origin', 'title': 'SocketDispatcherStats', 'type': 'object' } as const, { 'connected': SchemaNode.defineNumber({
    'description': 'Number of open socket connections',
    'minimum': 0,
    'type': 'integer'
  } as const), 'free': SchemaNode.defineNumber({
    'description': 'Number of open connections without active requests',
    'minimum': 0,
    'type': 'integer'
  } as const), 'pending': SchemaNode.defineNumber({
    'description': 'Number of pending requests waiting for a connection',
    'minimum': 0,
    'type': 'integer'
  } as const), 'queued': SchemaNode.defineNumber({
    'description': 'Number of queued requests',
    'minimum': 0,
    'type': 'integer'
  } as const), 'running': SchemaNode.defineNumber({
    'description': 'Number of currently active requests',
    'minimum': 0,
    'type': 'integer'
  } as const), 'size': SchemaNode.defineNumber({
    'description': 'Total number of active, pending, or queued requests',
    'minimum': 0,
    'type': 'integer'
  } as const) }, ['connected', 'free', 'pending', 'queued', 'running', 'size'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
