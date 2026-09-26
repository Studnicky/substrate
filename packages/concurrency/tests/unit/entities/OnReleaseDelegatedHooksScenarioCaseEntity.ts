import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { SemaphorePermitsInputEntity } from './common/SemaphorePermitsInputEntity.js';

/** The `onReleaseDelegated-hooks` scenario case shape `Semaphore.loop.spec.ts` exercises. */
export namespace OnReleaseDelegatedHooksScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': { 'additionalProperties': false, 'properties': { 'releaseDelegatedEvents': { 'type': 'number' }, 'releaseEvents': { 'type': 'number' } }, 'required': ['releaseDelegatedEvents', 'releaseEvents'], 'type': 'object' },
      'input': SemaphorePermitsInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'onReleaseDelegated-hooks' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'releaseDelegatedEvents': SchemaNode.defineNumber({ 'type': 'number' } as const), 'releaseEvents': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['releaseDelegatedEvents', 'releaseEvents'] as const, { 'additionalProperties': false }),
      'input': SemaphorePermitsInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('onReleaseDelegated-hooks' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
