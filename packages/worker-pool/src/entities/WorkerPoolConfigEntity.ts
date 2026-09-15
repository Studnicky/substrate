import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Canonical serializable configuration for worker-pool construction. */
export namespace WorkerPoolConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'batchConcurrency': { 'minimum': 1, 'type': 'integer' },
      'concurrency': { 'minimum': 1, 'type': 'integer' },
      'timeoutMs': { 'minimum': 0, 'type': 'number' },
      'workerPath': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['workerPath'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
