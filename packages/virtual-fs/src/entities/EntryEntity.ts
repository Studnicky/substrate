import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace EntryEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'kind': { 'enum': ['directory', 'file'], 'type': 'string' },
      'mtimeMs': { 'type': 'number' }
    },
    'required': ['kind', 'mtimeMs'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Internal directory/file entry metadata tracked by `VirtualFileSystem`. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
