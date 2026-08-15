import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Per-key lifecycle variant for `Coalesce`'s in-flight tracking. */
export namespace CoalesceKeyVariantEntity {
  export const Schema = {
    'enum': ['idle', 'inflight'],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
