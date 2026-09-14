import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { SemaphoreWaiterTransitionTypeEntity } from './SemaphoreWaiterTransitionTypeEntity.js';

/** Canonical lifecycle transition request for a Semaphore waiter. */
export namespace SemaphoreWaiterTransitionEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'type': SemaphoreWaiterTransitionTypeEntity.Schema
    },
    'required': ['type'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
