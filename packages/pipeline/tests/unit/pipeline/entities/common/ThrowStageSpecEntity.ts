import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** One branch of the discriminated-union subclass stage spec, keyed by `shape: 'throw'`. */
export namespace ThrowStageSpecEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'message': { 'minLength': 1, 'type': 'string' }, 'shape': { 'const': 'throw' } },
    'required': ['message', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'message': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'shape': SchemaNode.defineConst('throw' as const) },
    ['message', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
