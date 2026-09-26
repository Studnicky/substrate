import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { SemaphorePermitsInputEntity } from './common/SemaphorePermitsInputEntity.js';

/** The `double-release-safe` scenario case shape `Semaphore.loop.spec.ts` exercises. */
export namespace DoubleReleaseSafeScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': { 'additionalProperties': false, 'properties': { 'availableAfterAcquire': { 'type': 'number' }, 'availableAfterRelease': { 'type': 'number' } }, 'required': ['availableAfterAcquire', 'availableAfterRelease'], 'type': 'object' },
      'input': SemaphorePermitsInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'double-release-safe' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'availableAfterAcquire': SchemaNode.defineNumber({ 'type': 'number' } as const), 'availableAfterRelease': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['availableAfterAcquire', 'availableAfterRelease'] as const, { 'additionalProperties': false }),
      'input': SemaphorePermitsInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('double-release-safe' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
