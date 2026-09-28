import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { ValueContextObjectEntity } from './ValueContextObjectEntity.js';

/** The `{value: {count, label}}` input shape `object-context-pass-through` exercises. */
export namespace ValueContextObjectInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'value': ValueContextObjectEntity.Schema },
    'required': ['value'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'value': ValueContextObjectEntity.Node }, ['value'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
