import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

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
  } as const satisfies JsonSchemaObjectType;
  export type Type = FromSchema<typeof Schema>;
  export const validate = SchemaValidator.compile<Type>(Schema);
}
