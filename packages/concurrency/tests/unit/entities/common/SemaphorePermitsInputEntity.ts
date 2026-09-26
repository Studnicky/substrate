import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{semaphore: {permits}}` input shape shared by most `Semaphore.loop.spec.ts` cases. */
export namespace SemaphorePermitsInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'semaphore': {
        'additionalProperties': false,
        'properties': { 'permits': { 'type': 'number' } },
        'required': ['permits'],
        'type': 'object'
      }
    },
    'required': ['semaphore'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'semaphore': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'permits': SchemaNode.defineNumber({ 'type': 'number' } as const) },
        ['permits'] as const,
        { 'additionalProperties': false }
      )
    },
    ['semaphore'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
