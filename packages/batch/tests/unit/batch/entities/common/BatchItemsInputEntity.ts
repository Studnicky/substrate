import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BatchConfigEntity } from './BatchConfigEntity.js';

/** The `{batch, items}` input shape shared by several `batch.loop.spec.ts` cases. */
export namespace BatchItemsInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'batch': BatchConfigEntity.Schema, 'items': { 'items': { 'type': 'number' }, 'type': 'array' } },
    'required': ['batch', 'items'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'batch': BatchConfigEntity.Node,
      'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined)
    }, ['batch', 'items'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
