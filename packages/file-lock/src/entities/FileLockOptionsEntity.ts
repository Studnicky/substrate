import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { DEFAULT_POLL_MS, DEFAULT_TIMEOUT_MS } from '../constants/FileLockDefaults.js';

export namespace FileLockOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'path': { 'minLength': 1, 'type': 'string' },
      'pollMs': { 'default': DEFAULT_POLL_MS, 'exclusiveMinimum': 0, 'type': 'number' },
      'timeoutMs': { 'default': DEFAULT_TIMEOUT_MS, 'exclusiveMinimum': 0, 'type': 'number' }
    },
    'required': ['path'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
