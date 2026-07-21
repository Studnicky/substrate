import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

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
  } as const satisfies JSONSchema;
  export type Type = FromSchema<typeof Schema>;
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
