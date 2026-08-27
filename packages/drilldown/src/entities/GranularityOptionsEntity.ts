import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { DateGranularityValueEntity } from './DateGranularityValueEntity.js';

/** Fine-grained configuration for grouping bucket sizes. */
export namespace GranularityOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'cidr': { 'type': 'integer' },
      'count': { 'type': 'integer' },
      'date': DateGranularityValueEntity.Schema,
      'density': { 'type': 'number' },
      'prefix': { 'type': 'integer' }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
