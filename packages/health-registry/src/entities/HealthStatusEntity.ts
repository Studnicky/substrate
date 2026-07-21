import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Tri-state health verdict shared by individual checks and aggregate evaluations. */
export namespace HealthStatusEntity {
  export const Schema = {
    'enum': ['healthy', 'degraded', 'unhealthy'],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
