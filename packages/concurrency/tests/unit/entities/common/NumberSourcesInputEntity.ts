import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{sources: number[][]}` input shape shared by several `AsyncIter.loop.spec.ts` merge cases. */
export namespace NumberSourcesInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'sources': { 'items': { 'items': { 'type': 'number' }, 'type': 'array' }, 'type': 'array' } },
    'required': ['sources'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'sources': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined), undefined)
    }, ['sources'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
