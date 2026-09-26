import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{value: number[]}` input shape `does-not-mutate-original-input` exercises. */
export namespace ValueNumberArrayInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'value': { 'items': { 'type': 'number' }, 'type': 'array' } },
    'required': ['value'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'value': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const)) },
    ['value'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
