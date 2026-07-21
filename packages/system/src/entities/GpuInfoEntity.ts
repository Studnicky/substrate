import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace GpuInfoEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'computeApi': { 'enum': ['cuda', 'metal', 'opencl', 'software'], 'type': 'string' },
      'name': { 'type': 'string' },
      'vramMb': { 'type': ['number', 'null'] }
    },
    'required': ['computeApi', 'name', 'vramMb'],
    'title': 'GpuInfoType',
    'type': 'object'
  } as const satisfies JSONSchema;
  export type Type = FromSchema<typeof Schema>;
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
