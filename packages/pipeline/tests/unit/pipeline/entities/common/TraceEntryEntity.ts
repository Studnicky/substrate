import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

/** A single `{hook, index}` trace record `TracingPipeline` emits. */
export namespace TraceEntryEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'hook': { 'minLength': 1, 'type': 'string' }, 'index': { 'type': 'number' } },
    'required': ['hook', 'index'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'hook': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'index': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['hook', 'index'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
