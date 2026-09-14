import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { SortDirectionEntity } from './SortDirectionEntity.js';

/** Rule specifying how to sort records or groups. */
export namespace SortRuleEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'direction': SortDirectionEntity.Schema,
      'property': { 'type': 'string' }
    },
    'required': ['direction', 'property'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
