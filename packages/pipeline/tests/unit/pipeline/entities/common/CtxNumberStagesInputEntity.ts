import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { SubclassStageSpecEntity } from './SubclassStageSpecEntity.js';

/** The `{ctx: number, stages}` input shape shared by most `PipelineSubclass.loop.spec.ts` cases. */
export namespace CtxNumberStagesInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'ctx': { 'type': 'number' }, 'stages': { 'items': SubclassStageSpecEntity.Schema, 'type': 'array' } },
    'required': ['ctx', 'stages'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    { 'ctx': SchemaNode.defineNumber({ 'type': 'number' } as const), 'stages': SchemaNode.defineArray({ 'type': 'array' } as const, SubclassStageSpecEntity.Node) },
    ['ctx', 'stages'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
