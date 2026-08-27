import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { GroupNodeValueEntity } from './GroupNodeValueEntity.js';

/** Single segment in a path from root to a specific node. */
export namespace PathSegmentEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'property': { 'type': 'string' },
      'value': GroupNodeValueEntity.Schema
    },
    'required': ['property', 'value'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
