import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BatchConfigEntity } from './BatchConfigEntity.js';

/** The `{batch, items, errorMessage}` input shape shared by `batchHooks.loop.spec.ts` all-items-fail cases. */
export namespace BatchItemsMessageInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'batch': BatchConfigEntity.Schema,
      'errorMessage': { 'minLength': 1, 'type': 'string' },
      'items': { 'items': { 'type': 'number' }, 'type': 'array' }
    },
    'required': ['batch', 'errorMessage', 'items'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'batch': BatchConfigEntity.Node,
      'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const))
    },
    ['batch', 'errorMessage', 'items'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
