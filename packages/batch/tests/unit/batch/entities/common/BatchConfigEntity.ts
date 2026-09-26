import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{maxConcurrent?}` batch-config shape shared by every `batch.loop.spec.ts` case. */
export namespace BatchConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'maxConcurrent': { 'type': 'number' } },
    'required': [],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'maxConcurrent': SchemaNode.defineNumber({ 'type': 'number' } as const) },
    [] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
