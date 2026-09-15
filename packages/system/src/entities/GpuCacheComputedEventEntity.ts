import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

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

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
