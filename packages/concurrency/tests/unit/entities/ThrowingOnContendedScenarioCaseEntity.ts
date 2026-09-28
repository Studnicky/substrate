import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { AvailableAfterHookNameExpectedEntity } from './common/AvailableAfterHookNameExpectedEntity.js';
import { MessageSemaphorePermitsInputEntity } from './common/MessageSemaphorePermitsInputEntity.js';

/** The `throwing-onContended` scenario case shape `Semaphore.loop.spec.ts` exercises. */
export namespace ThrowingOnContendedScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': AvailableAfterHookNameExpectedEntity.Schema,
      'input': MessageSemaphorePermitsInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'throwing-onContended' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': AvailableAfterHookNameExpectedEntity.Node,
      'input': MessageSemaphorePermitsInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'throwing-onContended' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
