import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace UserCreatedEventMapEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'user:created': {
        'additionalProperties': false,
        'properties': {
          'email': { 'type': 'string' },
          'id': { 'type': 'string' }
        },
        'required': ['email', 'id'],
        'type': 'object'
      }
    },
    'required': ['user:created'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
