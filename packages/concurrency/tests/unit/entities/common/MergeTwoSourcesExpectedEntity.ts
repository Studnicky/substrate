import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{includes, length}` expected shape for the `AsyncIter.loop.spec.ts` two-source merge case. */
export namespace MergeTwoSourcesExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'includes': { 'items': { 'type': 'number' }, 'type': 'array' }, 'length': { 'type': 'number' } },
    'required': ['includes', 'length'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'includes': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined),
      'length': SchemaNode.defineNumber({ 'type': 'number' } as const)
    }, ['includes', 'length'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
