import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** One branch of the discriminated-union subclass stage spec, keyed by `shape: 'add'`. */
export namespace AddStageSpecEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'shape': { 'const': 'add' }, 'value': { 'type': 'number' } },
    'required': ['shape', 'value'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst({}, 'add' as const), 'value': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['shape', 'value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
