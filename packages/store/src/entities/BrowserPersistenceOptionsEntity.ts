import type {
  EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Serializable browser persistence selection. */
export namespace BrowserPersistenceOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'storageTarget': {
        'enum': ['indexedDb', 'localStorage', 'memory', 'sessionStorage'],
        'type': 'string'
      }
    },
    'required': ['storageTarget'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
