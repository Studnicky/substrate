import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { ContextNumberStagesInputEntity } from './common/ContextNumberStagesInputEntity.js';

/** The `tracing-pipeline-result` scenario case shape `PipelineSubclass.loop.spec.ts` exercises. */
export namespace TracingPipelineResultScenarioCaseEntity {
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
      'input': ContextNumberStagesInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'tracing-pipeline-result' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'result': SchemaNode.defineNumber({ 'type': 'number' } as const)
    }, ['result'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': ContextNumberStagesInputEntity.Node,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'tracing-pipeline-result' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
