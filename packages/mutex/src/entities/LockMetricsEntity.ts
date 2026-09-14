import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace LockMetricsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'acquiredAt': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['acquiredAt'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Metrics recorded when a lock is acquired. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
