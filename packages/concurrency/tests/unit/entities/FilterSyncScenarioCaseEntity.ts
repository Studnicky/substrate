import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { FilterPredicateInputEntity } from './common/FilterPredicateInputEntity.js';
import { ItemsNumberArrayExpectedEntity } from './common/ItemsNumberArrayExpectedEntity.js';

/** The `filter-sync` scenario case shape `AsyncIter.loop.spec.ts` exercises. */
export namespace FilterSyncScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': ItemsNumberArrayExpectedEntity.Schema,
      'input': FilterPredicateInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'filter-sync' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': ItemsNumberArrayExpectedEntity.Node,
      'input': FilterPredicateInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'filter-sync' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
