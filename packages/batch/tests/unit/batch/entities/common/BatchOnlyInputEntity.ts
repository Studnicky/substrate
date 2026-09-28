import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BatchConfigEntity } from './BatchConfigEntity.js';

/** The `{batch}` input shape for the `batch.loop.spec.ts` invalid-config case. */
export namespace BatchOnlyInputEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'batch': BatchConfigEntity.Schema },
    'required': ['batch'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'batch': BatchConfigEntity.Node }, ['batch'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
