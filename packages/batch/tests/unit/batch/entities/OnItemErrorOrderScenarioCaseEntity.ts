import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BatchItemsMessageInputEntity } from './common/BatchItemsMessageInputEntity.js';

/** The `on-item-error-order` scenario case shape `batchHooks.loop.spec.ts` exercises. */
export namespace OnItemErrorOrderScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
          'order': { 'items': { 'type': 'string' }, 'type': 'array' },
          'rejectedMessage': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['order', 'rejectedMessage'],
        'type': 'object'
      },
      'input': BatchItemsMessageInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'on-item-error-order' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
          'order': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const)),
          'rejectedMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        },
        ['order', 'rejectedMessage'] as const,
        { 'additionalProperties': false }
      ),
      'input': BatchItemsMessageInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('on-item-error-order' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
