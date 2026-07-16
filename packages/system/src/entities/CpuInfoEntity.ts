import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

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
  } as const satisfies JsonSchemaObjectType;
  export type Type = FromSchema<typeof Schema>;
  export const validate = SchemaValidator.compile<Type>(Schema);
}
