import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/node';
import { SchemaNode } from '@studnicky/entity/types';

import { BatchItemsInputEntity } from './common/BatchItemsInputEntity.js';

/** The `process-default-max-concurrent` scenario case shape `batch.loop.spec.ts` exercises. */
export namespace ProcessDefaultMaximumConcurrentScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'defaultMaximumConcurrent': { 'type': 'number' }, 'maximumConcurrentObserved': { 'type': 'number' } },
        'required': ['defaultMaximumConcurrent', 'maximumConcurrentObserved'],
        'type': 'object'
      },
      'input': BatchItemsInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'process-default-max-concurrent' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'defaultMaximumConcurrent': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'maximumConcurrentObserved': SchemaNode.defineNumber({ 'type': 'number' } as const)
    }, ['defaultMaximumConcurrent', 'maximumConcurrentObserved'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': BatchItemsInputEntity.Node,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'process-default-max-concurrent' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
