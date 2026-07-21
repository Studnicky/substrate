import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace CpuInfoEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'arch': { 'type': 'string' },
      'logicalCount': { 'type': 'number' },
      'model': { 'type': 'string' },
      'physicalCount': { 'type': 'number' }
    },
    'required': ['arch', 'logicalCount', 'model', 'physicalCount'],
    'title': 'CpuInfoType',
    'type': 'object'
  } as const satisfies JSONSchema;
  export type Type = FromSchema<typeof Schema>;
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
