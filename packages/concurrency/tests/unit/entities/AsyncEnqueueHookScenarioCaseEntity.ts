import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { FirstKeySecondInputEntity } from './common/FirstKeySecondInputEntity.js';

/** The `async-enqueue-hook` scenario case shape `Channel.loop.spec.ts` exercises. */
export namespace AsyncEnqueueHookScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': {
        'additionalProperties': false,
        'properties': { 'nextValue': { 'type': 'number' }, 'rejectionCount': { 'type': 'number' } },
        'required': ['nextValue', 'rejectionCount'],
        'type': 'object'
      },
      'input': FirstKeySecondInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'async-enqueue-hook' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, {
      'nextValue': SchemaNode.defineNumber({ 'type': 'number' } as const),
      'rejectionCount': SchemaNode.defineNumber({ 'type': 'number' } as const)
    }, ['nextValue', 'rejectionCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': FirstKeySecondInputEntity.Node,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'async-enqueue-hook' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
