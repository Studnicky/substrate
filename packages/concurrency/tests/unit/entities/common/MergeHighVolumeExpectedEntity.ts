import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{first, last, length}` expected shape for the `AsyncIter.loop.spec.ts` high-volume merge case. */
export namespace MergeHighVolumeExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'first': { 'type': 'number' }, 'last': { 'type': 'number' }, 'length': { 'type': 'number' } },
    'required': ['first', 'last', 'length'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'first': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'last': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'length': SchemaNode.defineNumber({ 'type': 'number' } as const)
    }, ['first', 'last', 'length'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
