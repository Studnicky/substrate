import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace OrderLifecycleEventMapEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'order:placed': {
        'additionalProperties': false,
        'properties': {
          'id': { 'type': 'string' },
          'total': { 'type': 'number' }
        },
        'required': ['id', 'total'],
        'type': 'object'
      },
      'order:shipped': {
        'additionalProperties': false,
        'properties': {
          'carrier': { 'type': 'string' },
          'id': { 'type': 'string' }
        },
        'required': ['carrier', 'id'],
        'type': 'object'
      }
    },
    'required': ['order:placed', 'order:shipped'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
