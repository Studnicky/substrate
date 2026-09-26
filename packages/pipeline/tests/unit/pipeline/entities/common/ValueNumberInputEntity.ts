import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{value: number}` input shape shared by several `Pipeline.loop.spec.ts` cases. */
export namespace ValueNumberInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'value': { 'type': 'number' } },
    'required': ['value'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'value': SchemaNode.defineNumber({ 'type': 'number' } as const) },
    ['value'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
