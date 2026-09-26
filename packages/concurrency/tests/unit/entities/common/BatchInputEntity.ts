import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{batch: {itemCount}}` input shape for the `AsyncIter.loop.spec.ts` high-volume merge case. */
export namespace BatchInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'batch': {
        'additionalProperties': false,
        'properties': { 'itemCount': { 'type': 'number' } },
        'required': ['itemCount'],
        'type': 'object'
      }
    },
    'required': ['batch'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'batch': SchemaNode.defineObject({ 'type': 'object' } as const, { 'itemCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['itemCount'] as const, { 'additionalProperties': false, 'patternProperties': {} })
    }, ['batch'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
