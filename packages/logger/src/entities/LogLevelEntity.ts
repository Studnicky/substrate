import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Numeric log levels ordered from TRACE through SILENT. */
export namespace LogLevelEntity {
  export const Schema = {
    'description': 'Numeric log level ordered from TRACE through SILENT.',
    'enum': [0, 1, 2, 3, 4, 5],
    'type': 'integer'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
