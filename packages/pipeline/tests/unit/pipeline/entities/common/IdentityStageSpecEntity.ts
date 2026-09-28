import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** One branch of the discriminated-union subclass stage spec, keyed by `shape: 'identity'`. */
export namespace IdentityStageSpecEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'shape': { 'const': 'identity' } },
    'required': ['shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'shape': SchemaNode.defineConst({}, 'identity' as const) }, ['shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
