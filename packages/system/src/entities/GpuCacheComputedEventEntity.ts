import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

import { GpuInfoEntity } from './GpuInfoEntity.js';

/**
 * Reports the result of a GPU detection probe. Legal only from `uncomputed`
 * — the cache is write-once, mirroring the old `#gpuCache === undefined`
 * guard that made `PROVIDER.detectGpu()` run at most once per process.
 */
export namespace GpuCacheComputedEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'detected': { 'oneOf': [GpuInfoEntity.Schema, { 'type': 'null' }] },
      'type': { 'const': 'computed', 'type': 'string' }
    },
    'required': ['detected', 'type'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
