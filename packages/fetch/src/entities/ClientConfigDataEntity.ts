import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace ClientConfigDataEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'autoGenerateRequestId': { 'type': 'boolean' },
      'baseURL': { 'type': 'string' },
      'hookTimeoutMs': { 'minimum': 0, 'type': 'number' },
      'timeout': { 'minimum': 0, 'type': 'number' }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
