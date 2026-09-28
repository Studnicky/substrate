import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { SemaphorePermitsInputEntity } from './common/SemaphorePermitsInputEntity.js';

/** The `queue-waiters` scenario case shape `Semaphore.loop.spec.ts` exercises. */
export namespace QueueWaitersScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': { 'additionalProperties': false, 'properties': { 'availableAfterFirstRelease': { 'type': 'number' }, 'availableAfterSecondRelease': { 'type': 'number' }, 'secondAcquiredInitially': { 'type': 'boolean' } }, 'required': ['availableAfterFirstRelease', 'availableAfterSecondRelease', 'secondAcquiredInitially'], 'type': 'object' },
      'input': SemaphorePermitsInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'queue-waiters' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'availableAfterFirstRelease': SchemaNode.defineNumber({ 'type': 'number' } as const), 'availableAfterSecondRelease': SchemaNode.defineNumber({ 'type': 'number' } as const), 'secondAcquiredInitially': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['availableAfterFirstRelease', 'availableAfterSecondRelease', 'secondAcquiredInitially'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SemaphorePermitsInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'queue-waiters' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
