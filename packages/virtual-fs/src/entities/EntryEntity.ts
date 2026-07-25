import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace EntryEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'mtimeMs': { 'type': 'number' },
      'shape': { 'enum': ['directory', 'file'], 'type': 'string' }
    },
    'required': ['mtimeMs', 'shape'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Internal directory/file entry metadata tracked by `VirtualFileSystem`. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
