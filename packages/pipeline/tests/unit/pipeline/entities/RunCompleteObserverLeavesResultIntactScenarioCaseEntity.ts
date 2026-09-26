import type { NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { CtxNumberStagesInputEntity } from './common/CtxNumberStagesInputEntity.js';

/** The `run-complete-observer-leaves-result-intact` scenario case shape `PipelineSubclass.loop.spec.ts` exercises. */
export namespace RunCompleteObserverLeavesResultIntactScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': {
      'result': { 'type': 'number' }
        },
        'required': ['result'],
        'type': 'object'
      },
      'input': CtxNumberStagesInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'run-complete-observer-leaves-result-intact' }
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
      'result': SchemaNode.defineNumber({ 'type': 'number' } as const)
        },
        ['result'] as const,
        { 'additionalProperties': false }
      ),
      'input': CtxNumberStagesInputEntity.Node,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst('run-complete-observer-leaves-result-intact' as const)
    },
    ['description', 'expected', 'input', 'name', 'shape'] as const,
    { 'additionalProperties': false }
  );
  export type Type = NodeStaticType<typeof Node>;
}
