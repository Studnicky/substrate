import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { AvailableAfterHookNameExpectedEntity } from './common/AvailableAfterHookNameExpectedEntity.js';
import { MessageSemaphorePermitsInputEntity } from './common/MessageSemaphorePermitsInputEntity.js';

/** The `async-onContended-reject` scenario case shape `Semaphore.loop.spec.ts` exercises. */
export namespace AsyncOnContendedRejectScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': AvailableAfterHookNameExpectedEntity.Schema,
      'input': MessageSemaphorePermitsInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'async-onContended-reject' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': AvailableAfterHookNameExpectedEntity.Node,
      'input': MessageSemaphorePermitsInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'async-onContended-reject' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
