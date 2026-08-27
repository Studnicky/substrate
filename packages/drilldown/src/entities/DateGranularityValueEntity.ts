import type { SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/**
 * String-literal union of all valid temporal granularity values.
 * Use this type for parameters and config fields; use DateGranularity enum
 * as a convenience for building values.
 */
export namespace DateGranularityValueEntity {
  export const Schema = {
    'enum': ['day', 'month', 'quarter', 'week', 'year'],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
}
