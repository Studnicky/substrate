import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace MemoryInfoEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'freeMb': { 'type': 'number' },
      'totalMb': { 'type': 'number' }
    },
    'required': ['freeMb', 'totalMb'],
    'title': 'MemoryInfoType',
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;
  export type Type = FromSchema<typeof Schema>;
  export const validate = SchemaValidator.compile<Type>(Schema);
}
