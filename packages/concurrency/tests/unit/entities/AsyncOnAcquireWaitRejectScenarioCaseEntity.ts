import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { MessageSemaphorePermitsInputEntity } from './common/MessageSemaphorePermitsInputEntity.js';

/** The `async-onAcquireWait-reject` scenario case shape `Semaphore.loop.spec.ts` exercises. */
export namespace AsyncOnAcquireWaitRejectScenarioCaseEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'description': { 'minLength': 1, 'type': 'string' },
      'expected': { 'additionalProperties': false, 'properties': { 'availableAfter': { 'type': 'number' }, 'hookName': { 'minLength': 1, 'type': 'string' }, 'thirdAcquiredBeforeResolve': { 'type': 'boolean' } }, 'required': ['availableAfter', 'hookName', 'thirdAcquiredBeforeResolve'], 'type': 'object' },
      'input': MessageSemaphorePermitsInputEntity.Schema,
      'name': { 'minLength': 1, 'type': 'string' },
      'shape': { 'const': 'async-onAcquireWait-reject' }
    },
    'required': ['description', 'expected', 'input', 'name', 'shape'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, {
    'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'expected': SchemaNode.defineObject({ 'type': 'object' } as const, { 'availableAfter': SchemaNode.defineNumber({ 'type': 'number' } as const), 'hookName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), 'thirdAcquiredBeforeResolve': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['availableAfter', 'hookName', 'thirdAcquiredBeforeResolve'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
    'input': MessageSemaphorePermitsInputEntity.Node,
    'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
    'shape': SchemaNode.defineConst({}, 'async-onAcquireWait-reject' as const)
  }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
