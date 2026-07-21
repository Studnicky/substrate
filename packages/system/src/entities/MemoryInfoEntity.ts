import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

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
  } as const satisfies JSONSchema;
  export type Type = FromSchema<typeof Schema>;
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
