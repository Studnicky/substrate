import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BatchConfigEntity } from './BatchConfigEntity.js';

/** The `{batch, items, errorItem, errorMessage}` input shape shared by `batch.loop.spec.ts` failure cases. */
export namespace BatchItemsErrorInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'batch': BatchConfigEntity.Schema,
      'errorItem': { 'type': 'number' },
      'errorMessage': { 'minLength': 1, 'type': 'string' },
      'items': { 'items': { 'type': 'number' }, 'type': 'array' }
    },
    'required': ['batch', 'errorItem', 'errorMessage', 'items'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'batch': BatchConfigEntity.Node,
      'errorItem': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined)
    }, ['batch', 'errorItem', 'errorMessage', 'items'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
