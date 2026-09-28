import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { SubclassStageSpecEntity } from './SubclassStageSpecEntity.js';

/** The `{stages}` input shape `protected-fns-length` exercises, with no `ctx`. */
export namespace StagesOnlyInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'stages': { 'items': SubclassStageSpecEntity.Schema, 'type': 'array' } },
    'required': ['stages'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'stages': SchemaNode.defineArray({ 'type': 'array' } as const, SubclassStageSpecEntity.Node, undefined) }, ['stages'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
