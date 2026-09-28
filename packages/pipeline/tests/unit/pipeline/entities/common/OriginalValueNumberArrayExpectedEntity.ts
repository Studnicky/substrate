import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{original, value}` expected shape `does-not-mutate-original-input` exercises. */
export namespace OriginalValueNumberArrayExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'original': { 'items': { 'type': 'number' }, 'type': 'array' },
      'value': { 'items': { 'type': 'number' }, 'type': 'array' }
    },
    'required': ['original', 'value'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'original': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined),
      'value': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined)
    }, ['original', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
