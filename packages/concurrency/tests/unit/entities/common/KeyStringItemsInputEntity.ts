import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{key, items: string[]}` input shape shared by several `Channel.loop.spec.ts` cases. */
export namespace KeyStringItemsInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'items': { 'items': { 'type': 'string' }, 'type': 'array' }, 'key': { 'minLength': 1, 'type': 'string' } },
    'required': ['items', 'key'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
      'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
    }, ['items', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
