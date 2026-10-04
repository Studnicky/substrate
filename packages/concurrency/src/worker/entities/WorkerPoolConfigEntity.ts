import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Canonical serializable configuration for worker-pool construction. */
export namespace WorkerPoolConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'batchConcurrency': { 'minimum': 1, 'type': 'integer' },
      'concurrency': { 'minimum': 1, 'type': 'integer' },
      'startupTimeoutMs': { 'minimum': 0, 'type': 'number' },
      'timeoutMs': { 'minimum': 0, 'type': 'number' },
      'workerPath': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['workerPath'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'batchConcurrency': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'concurrency': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'startupTimeoutMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'timeoutMs': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'workerPath': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const) }, ['workerPath'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
