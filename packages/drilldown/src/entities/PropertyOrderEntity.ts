import type { SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { PropertyPathEntity } from './PropertyPathEntity.js';

/** Ordered list of property paths selected for progressive multi-level grouping. */
export namespace PropertyOrderEntity {
  export const Schema = {
    'items': PropertyPathEntity.Schema,
    'type': 'array'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
}
