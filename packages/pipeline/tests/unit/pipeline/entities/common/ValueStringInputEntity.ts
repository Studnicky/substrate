import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{value: string}` input shape shared by several `Pipeline.loop.spec.ts` cases. */
export namespace ValueStringInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'value': { 'type': 'string' } },
    'required': ['value'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': SchemaNode.defineString({ 'type': 'string' } as const) }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
