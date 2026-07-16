import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace EntryEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'kind': { 'enum': ['directory', 'file'], 'type': 'string' },
      'mtimeMs': { 'type': 'number' }
    },
    'required': ['kind', 'mtimeMs'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  /** Internal directory/file entry metadata tracked by `VirtualFileSystem`. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
