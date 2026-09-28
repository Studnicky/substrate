import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { CtxNumberStagesInputEntity } from './common/CtxNumberStagesInputEntity.js';

/** The `no-stage-hooks-with-empty-pipeline` scenario case shape `PipelineSubclass.loop.spec.ts` exercises. */
export namespace NoStageHooksWithEmptyPipelineScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
      'stageStartCount': { 'type': 'number' },
      'stageSuccessCount': { 'type': 'number' }
        },
        'required': ['stageStartCount', 'stageSuccessCount'],
        'type': 'object'
      },
      'input': CtxNumberStagesInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'no-stage-hooks-with-empty-pipeline' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'stageStartCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'stageSuccessCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
        }, ['stageStartCount', 'stageSuccessCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
      'input': CtxNumberStagesInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, 'no-stage-hooks-with-empty-pipeline' as const)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
}
