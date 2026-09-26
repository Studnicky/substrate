import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { NumberSourcesInputEntity } from './common/NumberSourcesInputEntity.js';
import { MergeTwoSourcesExpectedEntity } from './common/MergeTwoSourcesExpectedEntity.js';

/** The `merge-two-sources` scenario case shape `AsyncIter.loop.spec.ts` exercises. */
export namespace MergeTwoSourcesScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': MergeTwoSourcesExpectedEntity.Schema,
      'input': NumberSourcesInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'merge-two-sources' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': MergeTwoSourcesExpectedEntity.Node,
      'input': NumberSourcesInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('merge-two-sources' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
