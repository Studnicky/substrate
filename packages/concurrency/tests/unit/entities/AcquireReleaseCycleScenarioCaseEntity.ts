import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { SemaphorePermitsInputEntity } from './common/SemaphorePermitsInputEntity.js';

/** The `acquire-release-cycle` scenario case shape `Semaphore.loop.spec.ts` exercises. */
export namespace AcquireReleaseCycleScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': { 'additionalProperties': false, 'properties': { 'availableAfterAcquire1': { 'type': 'number' }, 'availableAfterAcquire2': { 'type': 'number' }, 'availableAfterRelease1': { 'type': 'number' }, 'availableAfterRelease2': { 'type': 'number' }, 'availableInitial': { 'type': 'number' } }, 'required': ['availableAfterAcquire1', 'availableAfterAcquire2', 'availableAfterRelease1', 'availableAfterRelease2', 'availableInitial'], 'type': 'object' },
      'input': SemaphorePermitsInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'acquire-release-cycle' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'availableAfterAcquire1': SchemaNode.defineNumber({ 'type': 'number' } as const), 'availableAfterAcquire2': SchemaNode.defineNumber({ 'type': 'number' } as const), 'availableAfterRelease1': SchemaNode.defineNumber({ 'type': 'number' } as const), 'availableAfterRelease2': SchemaNode.defineNumber({ 'type': 'number' } as const), 'availableInitial': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['availableAfterAcquire1', 'availableAfterAcquire2', 'availableAfterRelease1', 'availableAfterRelease2', 'availableInitial'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': SemaphorePermitsInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'acquire-release-cycle' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
