import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical metadata attached to one dead-letter queue entry. */
export namespace DlqEntryMetadataEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'enqueuedAtMs': { 'minimum': 0, 'type': 'number' },
      'id': { 'minLength': 1, 'type': 'string' },
      'reason': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['enqueuedAtMs', 'id', 'reason'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
