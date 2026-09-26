import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{batchStartCount, total}` expected shape shared by `batchHooks.loop.spec.ts` batch-start cases. */
export namespace BatchStartExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'batchStartCount': { 'type': 'number' }, 'total': { 'type': 'number' } },
    'required': ['batchStartCount', 'total'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'batchStartCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'total': SchemaNode.defineNumber({ 'type': 'number' } as const)
    },
    ['batchStartCount', 'total'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
