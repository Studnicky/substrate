import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { FilterAsyncInputEntity } from './common/FilterAsyncInputEntity.js';
import { ItemsStringArrayExpectedEntity } from './common/ItemsStringArrayExpectedEntity.js';

/** The `filter-async` scenario case shape `AsyncIter.loop.spec.ts` exercises. */
export namespace FilterAsyncScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': ItemsStringArrayExpectedEntity.Schema,
      'input': FilterAsyncInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'filter-async' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': ItemsStringArrayExpectedEntity.Node,
      'input': FilterAsyncInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('filter-async' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
