import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Canonical transition event for RetryCallMachine. */
export namespace RetryCallTransitionEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'to': { 'enum': ['aborted', 'attempting', 'exhausted', 'failed', 'succeeded', 'waiting'], 'type': 'string' },
      'type': { 'enum': ['transitionTo'], 'type': 'string' }
    },
    'required': ['to', 'type'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
