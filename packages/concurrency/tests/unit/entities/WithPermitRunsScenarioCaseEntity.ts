import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { SemaphorePermitsInputEntity } from './common/SemaphorePermitsInputEntity.js';

/** The `withPermit-runs` scenario case shape `Semaphore.loop.spec.ts` exercises. */
export namespace WithPermitRunsScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': { 'additionalProperties': false, 'properties': { 'availableAfter': { 'type': 'number' }, 'inside': { 'type': 'boolean' } }, 'required': ['availableAfter', 'inside'], 'type': 'object' },
      'input': SemaphorePermitsInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'withPermit-runs' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'availableAfter': SchemaNode.defineNumber({ 'type': 'number' } as const), 'inside': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['availableAfter', 'inside'] as const, { 'additionalProperties': false }),
      'input': SemaphorePermitsInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('withPermit-runs' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
