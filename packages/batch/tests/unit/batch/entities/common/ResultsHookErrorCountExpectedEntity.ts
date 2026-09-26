import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{results, hookErrorCount}` expected shape shared by `batchHooks.loop.spec.ts` throwing-hook cases. */
export namespace ResultsHookErrorCountExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'hookErrorCount': { 'type': 'number' }, 'results': { 'items': { 'type': 'number' }, 'type': 'array' } },
    'required': ['hookErrorCount', 'results'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'hookErrorCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'results': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const))
    },
    ['hookErrorCount', 'results'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
