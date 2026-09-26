import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** The `{count, label}` context object `object-context-pass-through` passes through pipeline stages. */
export namespace ValueContextObjectEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'count': { 'type': 'number' }, 'label': { 'minLength': 1, 'type': 'string' } },
    'required': ['count', 'label'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'count': SchemaNode.defineNumber({ 'type': 'number' } as const), 'label': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['count', 'label'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
