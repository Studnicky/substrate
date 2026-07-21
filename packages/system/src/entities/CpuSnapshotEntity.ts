import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace CpuSnapshotEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'logicalCount': { 'type': 'number' },
      'model': { 'type': 'string' },
      'physicalCount': { 'type': 'number' }
    },
    'required': ['logicalCount', 'model', 'physicalCount'],
    'title': 'CpuSnapshotType',
    'type': 'object'
  } as const satisfies JSONSchema;
  export type Type = FromSchema<typeof Schema>;
  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
