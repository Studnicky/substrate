import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{items: string[]}` expected shape for the `Channel.loop.spec.ts` live-subscribe case. */
export namespace StringItemsExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'items': { 'items': { 'type': 'string' }, 'type': 'array' } },
    'required': ['items'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'items': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined) }, ['items'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
