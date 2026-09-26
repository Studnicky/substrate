import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{message, semaphore: {permits}}` input shape shared by several `Semaphore.loop.spec.ts` hook cases. */
export namespace MessageSemaphorePermitsInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'message': { 'minLength': 1, 'type': 'string' },
      'semaphore': {
        'additionalProperties': false,
        'properties': { 'permits': { 'type': 'number' } },
        'required': ['permits'],
        'type': 'object'
      }
    },
    'required': ['message', 'semaphore'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'semaphore': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        { 'permits': SchemaNode.defineNumber({ 'type': 'number' } as const) },
        ['permits'] as const,
        { 'additionalProperties': false }
      )
    },
    ['message', 'semaphore'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
