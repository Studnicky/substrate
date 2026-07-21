import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical enqueue timestamp retained by a pending mutex acquisition. */
export namespace MutexQueueEntryEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': { 'queuedAt': { 'minimum': 0, 'type': 'number' } },
    'required': ['queuedAt'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
