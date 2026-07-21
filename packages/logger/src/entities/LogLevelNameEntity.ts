import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** String names accepted for log-level configuration. */
export namespace LogLevelNameEntity {
  export const Schema = {
    'description': 'String name accepted for log-level configuration.',
    'enum': ['debug', 'error', 'info', 'silent', 'trace', 'warn'],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
