import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{results: number[]}` expected shape shared by several `batch.loop.spec.ts` cases. */
export namespace ResultsExpectedEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'results': { 'items': { 'type': 'number' }, 'type': 'array' } },
    'required': ['results'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'results': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined) }, ['results'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
