import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { BatchItemsInputEntity } from './common/BatchItemsInputEntity.js';
import { ConcurrencySaturatedExpectedEntity } from './common/ConcurrencySaturatedExpectedEntity.js';

/** The `on-concurrency-saturated` scenario case shape `batchHooks.loop.spec.ts` exercises. */
export namespace OnConcurrencySaturatedScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': ConcurrencySaturatedExpectedEntity.Schema,
      'input': BatchItemsInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'on-concurrency-saturated' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': ConcurrencySaturatedExpectedEntity.Node,
      'input': BatchItemsInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'on-concurrency-saturated' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
