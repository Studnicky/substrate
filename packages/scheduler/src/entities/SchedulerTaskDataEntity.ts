import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace SchedulerTaskDataEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'atMs': { 'type': 'number' },
      'intervalMs': { 'minimum': 0, 'type': 'number' },
      'variant': { 'enum': ['interval', 'timeout'], 'type': 'string' }
    },
    'required': ['atMs', 'intervalMs', 'variant'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Serializable scheduling data retained for a pending task. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
