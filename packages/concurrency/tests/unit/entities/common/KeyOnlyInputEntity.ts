import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{key}` input shape shared by several `Coalesce.loop.spec.ts` hook-ordering cases. */
export namespace KeyOnlyInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'key': { 'minLength': 1, 'type': 'string' } },
    'required': ['key'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['key'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
