import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace PaginatorNamedPageEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'items': {
        'items': {
          'additionalProperties': false,
          'properties': { 'name': { 'type': 'string' } },
          'required': ['name'],
          'type': 'object'
        },
        'type': 'array'
      }
    },
    'required': ['items'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
