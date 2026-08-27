import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

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

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
