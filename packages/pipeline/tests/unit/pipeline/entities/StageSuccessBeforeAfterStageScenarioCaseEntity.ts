import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { CtxNumberStagesInputEntity } from './common/CtxNumberStagesInputEntity.js';

/** The `stage-success-before-after-stage` scenario case shape `PipelineSubclass.loop.spec.ts` exercises. */
export namespace StageSuccessBeforeAfterStageScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
      'order': { 'items': { 'minLength': 1, 'type': 'string' }, 'type': 'array' }
        },
        'required': ['order'],
        'type': 'object'
      },
      'input': CtxNumberStagesInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'stage-success-before-after-stage' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject(
    { 'type': 'object' } as const,
    {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject(
        { 'type': 'object' } as const,
        {
      'order': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const))
        },
        ['order'] as const,
        { 'additionalProperties': false }
      ),
      'input': CtxNumberStagesInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('stage-success-before-after-stage' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
