import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{concurrencySaturatedCount}` expected shape shared by `batchHooks.loop.spec.ts` saturation cases. */
export namespace ConcurrencySaturatedExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'concurrencySaturatedCount': { 'type': 'number' } },
    'required': ['concurrencySaturatedCount'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'concurrencySaturatedCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['concurrencySaturatedCount'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
