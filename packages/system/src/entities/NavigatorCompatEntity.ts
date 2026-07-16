import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

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
  } as const satisfies JsonSchemaObjectType;
  export type Type = FromSchema<typeof Schema>;
  export const validate = SchemaValidator.compile<Type>(Schema);
}
