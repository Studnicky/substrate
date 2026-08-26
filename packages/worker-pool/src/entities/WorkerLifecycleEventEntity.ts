import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { WorkerLifecycleAssignEventEntity } from './WorkerLifecycleAssignEventEntity.js';
import { WorkerLifecycleFreeEventEntity } from './WorkerLifecycleFreeEventEntity.js';
import { WorkerLifecycleKillEventEntity } from './WorkerLifecycleKillEventEntity.js';

/**
 * Canonical union of `WorkerLifecycleMachine`'s three transition events — see
 * `WorkerLifecycleMachine.ts` for the state graph each one drives.
 */
export namespace WorkerLifecycleEventEntity {
  export const Schema = {
    'oneOf': [WorkerLifecycleAssignEventEntity.Schema, WorkerLifecycleFreeEventEntity.Schema, WorkerLifecycleKillEventEntity.Schema]
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
