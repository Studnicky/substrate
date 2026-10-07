import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

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
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/DispatcherHealth', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Dispatcher health assessment result', 'title': 'DispatcherHealth', 'type': 'object' } as const, { 'healthy': SchemaNode.defineBoolean({
    'description': 'Whether the dispatcher is healthy (not overloaded)',
    'type': 'boolean'
  } as const), 'queueRatio': SchemaNode.defineNumber({
    'description': 'Queue ratio: pending requests / connected sockets. Undefined if no dispatcher exists for this origin.',
    'type': 'number'
  } as const), 'recommendation': SchemaNode.defineString({
    'description': 'Recommendation for improving dispatcher health. Undefined if dispatcher is healthy or doesn\'t exist.',
    'type': 'string'
  } as const), 'stats': SocketDispatcherStatsEntity.Node }, ['healthy'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
