import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{acquireWaitEvents, contendedEvents}` expected shape shared by `Semaphore.loop.spec.ts` contention cases. */
export namespace AcquireWaitContendedExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'acquireWaitEvents': { 'type': 'number' },
      'contendedEvents': { 'items': { 'type': 'number' }, 'type': 'array' }
    },
    'required': ['acquireWaitEvents', 'contendedEvents'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'acquireWaitEvents': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'contendedEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const))
    },
    ['acquireWaitEvents', 'contendedEvents'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
