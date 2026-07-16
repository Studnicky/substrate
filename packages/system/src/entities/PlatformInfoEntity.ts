import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace PlatformInfoEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'isAppleSilicon': { 'type': 'boolean' },
      'nodeVersion': { 'type': 'string' },
      'os': { 'type': 'string' }
    },
    'required': ['isAppleSilicon', 'nodeVersion', 'os'],
    'title': 'PlatformInfoType',
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;
  export type Type = FromSchema<typeof Schema>;
  export const validate = SchemaValidator.compile<Type>(Schema);
}
