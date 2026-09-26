import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BatchesExpectedEntity } from './common/BatchesExpectedEntity.js';
import { BatchItemsDelayMsInputEntity } from './common/BatchItemsDelayMsInputEntity.js';

/** The `process-multi-batch` scenario case shape `batch.loop.spec.ts` exercises. */
export namespace ProcessMultiBatchScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': BatchesExpectedEntity.Schema,
      'input': BatchItemsDelayMsInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'process-multi-batch' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': BatchesExpectedEntity.Node,
      'input': BatchItemsDelayMsInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('process-multi-batch' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
