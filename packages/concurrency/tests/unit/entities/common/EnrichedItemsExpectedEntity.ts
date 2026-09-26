import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{items: {id, label?}[]}` expected shape shared by `AsyncIter.loop.spec.ts` enrich cases. */
export namespace EnrichedItemsExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'items': {
        'items': {
          'additionalProperties': false,
          'properties': { 'id': { 'type': 'number' }, 'label': { 'type': 'string' } },
          'required': ['id'],
          'type': 'object'
        },
        'type': 'array'
      }
    },
    'required': ['items'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'items': SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineObject(
          { 'type': 'object' } as const,
          { 'id': SchemaNode.defineNumber({ 'type': 'number' } as const), 'label': SchemaNode.defineString({ 'type': 'string' } as const) },
          ['id'] as const,
          { 'additionalProperties': false }
        )
      )
    },
    ['items'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
