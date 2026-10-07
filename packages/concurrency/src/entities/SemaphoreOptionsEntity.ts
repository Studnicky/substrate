import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

export namespace SemaphoreOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'maximumQueueSize': { 'minimum': 0, 'type': 'integer' },
      'permits': { 'minimum': 1, 'type': 'integer' }
    },
    'required': ['permits'],
    'type': 'object'
  } as const;

  /** Construction options for {@link Semaphore}. */
  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'maximumQueueSize': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'permits': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const) }, ['permits'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
