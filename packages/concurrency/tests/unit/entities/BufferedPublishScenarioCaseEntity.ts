import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { KeyNumberItemsInputEntity } from './common/KeyNumberItemsInputEntity.js';
import { NumberItemsExpectedEntity } from './common/NumberItemsExpectedEntity.js';

/** The `buffered-publish` scenario case shape `Channel.loop.spec.ts` exercises. */
export namespace BufferedPublishScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': NumberItemsExpectedEntity.Schema,
      'input': KeyNumberItemsInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'buffered-publish' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': NumberItemsExpectedEntity.Node,
      'input': KeyNumberItemsInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('buffered-publish' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
