import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { NumberStagesValueInputEntity } from './common/NumberStagesValueInputEntity.js';
import { ValueNumberInputEntity } from './common/ValueNumberInputEntity.js';

/** The `hanging-observer-has-no-effect` scenario case shape `Pipeline.loop.spec.ts` exercises. */
export namespace HangingObserverHasNoEffectScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': ValueNumberInputEntity.Schema,
      'input': NumberStagesValueInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'hanging-observer-has-no-effect' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': ValueNumberInputEntity.Node,
      'input': NumberStagesValueInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'hanging-observer-has-no-effect' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
