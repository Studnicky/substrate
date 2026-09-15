import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { FilterOperatorEntity } from './FilterOperatorEntity.js';

/** Filter rule matching records by exact property values. */
export namespace ValueFilterRuleEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'operator': FilterOperatorEntity.Schema,
      'property': { 'type': 'string' },
      'type': { 'const': 'value' },
      'values': { 'items': { 'type': 'string' }, 'type': 'array' }
    },
    'required': ['operator', 'property', 'type', 'values'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
