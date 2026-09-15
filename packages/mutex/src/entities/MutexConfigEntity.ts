import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace MutexConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'enableCoalescing': { 'default': false, 'type': 'boolean' },
      'maximumQueueSize': { 'default': 0, 'minimum': 0, 'type': 'integer' },
      'timeout': { 'default': 0, 'minimum': 0, 'type': 'integer' }
    },
    'propertyNames': {
      'enum': ['enableCoalescing', 'maximumQueueSize', 'timeout']
    },
    'required': ['enableCoalescing', 'maximumQueueSize', 'timeout'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Mutex configuration options. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
