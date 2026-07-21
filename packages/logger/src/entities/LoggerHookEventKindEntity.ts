import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Lifecycle event kinds emitted by an observed logger. */
export namespace LoggerHookEventKindEntity {
  export const Schema = {
    'enum': ['childCreate', 'dropped', 'log', 'transportError'],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
