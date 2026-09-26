import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{inflightAfter}` expected shape shared by several `Coalesce.loop.spec.ts` cases. */
export namespace InflightAfterExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'inflightAfter': { 'type': 'boolean' } },
    'required': ['inflightAfter'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'inflightAfter': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) },
    ['inflightAfter'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
