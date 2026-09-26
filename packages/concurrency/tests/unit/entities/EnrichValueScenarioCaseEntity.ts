import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EnrichValuesInputEntity } from './common/EnrichValuesInputEntity.js';
import { EnrichedItemsExpectedEntity } from './common/EnrichedItemsExpectedEntity.js';

/** The `enrich-value` scenario case shape `AsyncIter.loop.spec.ts` exercises. */
export namespace EnrichValueScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': EnrichedItemsExpectedEntity.Schema,
      'input': EnrichValuesInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'enrich-value' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': EnrichedItemsExpectedEntity.Node,
      'input': EnrichValuesInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('enrich-value' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
