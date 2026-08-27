import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

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

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
