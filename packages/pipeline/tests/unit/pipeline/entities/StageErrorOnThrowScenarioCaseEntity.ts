import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { CtxNumberStagesInputEntity } from './common/CtxNumberStagesInputEntity.js';

/** The `stage-error-on-throw` scenario case shape `PipelineSubclass.loop.spec.ts` exercises. */
export namespace StageErrorOnThrowScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
      'stageErrorIndex': { 'type': 'number' },
      'stageErrorMessage': { 'minLength': 1, 'type': 'string' }
        },
        'required': ['stageErrorIndex', 'stageErrorMessage'],
        'type': 'object'
      },
      'input': CtxNumberStagesInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'stage-error-on-throw' }
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
      'stageErrorIndex': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'stageErrorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
        },
        ['stageErrorIndex', 'stageErrorMessage'] as const,
        { 'additionalProperties': false }
      ),
      'input': CtxNumberStagesInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('stage-error-on-throw' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
