import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { SubclassStageSpecEntity } from './SubclassStageSpecEntity.js';

/** The `{ctx: string, stages}` input shape `no-hooks-no-stages` exercises. */
export namespace CtxStringStagesInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'ctx': { 'type': 'string' }, 'stages': { 'items': SubclassStageSpecEntity.Schema, 'type': 'array' } },
    'required': ['ctx', 'stages'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'ctx': SchemaNode.defineString({ 'type': 'string' } as const), 'stages': SchemaNode.defineArray({ 'type': 'array' } as const, SubclassStageSpecEntity.Node) },
    ['ctx', 'stages'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
