import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{first, key, second}` input shape shared by `Channel.loop.spec.ts` enqueue-hook cases. */
export namespace FirstKeySecondInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'first': { 'type': 'number' }, 'key': { 'minLength': 1, 'type': 'string' }, 'second': { 'type': 'number' } },
    'required': ['first', 'key', 'second'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'first': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'second': SchemaNode.defineNumber({ 'type': 'number' } as const)
    },
    ['first', 'key', 'second'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
