import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { NumberSourcesInputEntity } from './common/NumberSourcesInputEntity.js';
import { ItemsNumberArrayExpectedEntity } from './common/ItemsNumberArrayExpectedEntity.js';

/** The `merge-single` scenario case shape `AsyncIter.loop.spec.ts` exercises. */
export namespace MergeSingleScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': ItemsNumberArrayExpectedEntity.Schema,
      'input': NumberSourcesInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'merge-single' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': ItemsNumberArrayExpectedEntity.Node,
      'input': NumberSourcesInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'merge-single' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
