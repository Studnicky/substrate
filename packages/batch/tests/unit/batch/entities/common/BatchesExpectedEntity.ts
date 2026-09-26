import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{batches: number[][]}` expected shape shared by several `batch.loop.spec.ts` cases. */
export namespace BatchesExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'batches': { 'items': { 'items': { 'type': 'number' }, 'type': 'array' }, 'type': 'array' } },
    'required': ['batches'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'batches': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const))
      )
    },
    ['batches'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
