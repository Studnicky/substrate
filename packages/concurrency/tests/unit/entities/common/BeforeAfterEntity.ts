import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{before, after}` shape shared by the `Channel.loop.spec.ts` onClose-hooks input and expected. */
export namespace BeforeAfterEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'after': { 'type': 'number' }, 'before': { 'type': 'number' } },
    'required': ['after', 'before'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'after': SchemaNode.defineNumber({ 'type': 'number' } as const), 'before': SchemaNode.defineNumber({ 'type': 'number' } as const) },
    ['after', 'before'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
