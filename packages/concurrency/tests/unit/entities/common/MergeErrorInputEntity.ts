import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{errorMessage, sources}` input shape for the `AsyncIter.loop.spec.ts` error-propagation case. */
export namespace MergeErrorInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'errorMessage': { 'minLength': 1, 'type': 'string' },
      'sources': { 'items': { 'items': { 'type': 'number' }, 'type': 'array' }, 'type': 'array' }
    },
    'required': ['errorMessage', 'sources'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'errorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'sources': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined), undefined)
    }, ['errorMessage', 'sources'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
