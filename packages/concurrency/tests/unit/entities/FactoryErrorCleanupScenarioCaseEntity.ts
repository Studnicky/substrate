import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { InflightAfterExpectedEntity } from './common/InflightAfterExpectedEntity.js';
import { KeyMessageInputEntity } from './common/KeyMessageInputEntity.js';

/** The `factory-error-cleanup` scenario case shape `Coalesce.loop.spec.ts` exercises. */
export namespace FactoryErrorCleanupScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': InflightAfterExpectedEntity.Schema,
      'input': KeyMessageInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'factory-error-cleanup' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': InflightAfterExpectedEntity.Node,
      'input': KeyMessageInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('factory-error-cleanup' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
