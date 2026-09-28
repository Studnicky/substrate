import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { OriginalValueNumberArrayExpectedEntity } from './common/OriginalValueNumberArrayExpectedEntity.js';
import { ValueNumberArrayInputEntity } from './common/ValueNumberArrayInputEntity.js';

/** The `does-not-mutate-original-input` scenario case shape `Pipeline.loop.spec.ts` exercises. */
export namespace DoesNotMutateOriginalInputScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': OriginalValueNumberArrayExpectedEntity.Schema,
      'input': ValueNumberArrayInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'does-not-mutate-original-input' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': OriginalValueNumberArrayExpectedEntity.Node,
      'input': ValueNumberArrayInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'does-not-mutate-original-input' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
