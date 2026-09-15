import type {
  EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface
} from '@studnicky/entity/interfaces';
import type {
  FromSchema, JSONSchema
} from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Validated options for acquiring a browser Web Lock. */
export namespace WebLockOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'name': {
        'minLength': 1, 'type': 'string'
      }
    },
    'required': ['name'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
