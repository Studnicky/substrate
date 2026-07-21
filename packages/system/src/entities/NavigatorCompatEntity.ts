import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace NavigatorCompatEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'deviceMemory': { 'type': 'number' },
      'hardwareConcurrency': { 'type': 'number' },
      'userAgent': { 'type': 'string' },
      'userAgentData': {
        'additionalProperties': false,
        'properties': {
          'platform': { 'type': 'string' }
        },
        'type': 'object'
      }
    },
    'title': 'NavigatorCompat',
    'type': 'object'
  } as const satisfies JSONSchema;
  export type Type = FromSchema<typeof Schema>;
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
