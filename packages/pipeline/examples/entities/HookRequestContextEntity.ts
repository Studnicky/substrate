import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace HookRequestContextEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'elapsed': { 'minimum': 0, 'type': 'number' },
      'headers': {
        'additionalProperties': { 'type': 'string' },
        'type': 'object'
      },
      'url': { 'type': 'string' }
    },
    'required': ['headers', 'url'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
