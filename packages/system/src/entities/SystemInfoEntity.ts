import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

import { CpuInfoEntity } from './CpuInfoEntity.js';
import { GpuInfoEntity } from './GpuInfoEntity.js';
import { MemoryInfoEntity } from './MemoryInfoEntity.js';
import { PlatformInfoEntity } from './PlatformInfoEntity.js';

export namespace SystemInfoEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'cpu': CpuInfoEntity.Schema,
      'gpu': { 'oneOf': [GpuInfoEntity.Schema, { 'type': 'null' }] },
      'memory': MemoryInfoEntity.Schema,
      'platform': PlatformInfoEntity.Schema
    },
    'required': ['cpu', 'gpu', 'memory', 'platform'],
    'title': 'SystemInfoType',
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;
  export type Type = FromSchema<typeof Schema>;
  export const validate = SchemaValidator.compile<Type>(Schema);
}
