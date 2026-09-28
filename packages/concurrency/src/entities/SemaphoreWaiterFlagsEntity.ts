import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Serializable lifecycle flags retained for a queued semaphore waiter. */
export namespace SemaphoreWaiterFlagsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'cancelled': { 'type': 'boolean' },
      'ready': { 'type': 'boolean' }
    },
    'required': ['cancelled', 'ready'],
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'cancelled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'ready': SchemaNode.defineBoolean({ 'type': 'boolean' } as const) }, ['cancelled', 'ready'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
