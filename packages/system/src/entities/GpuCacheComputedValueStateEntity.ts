import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { GpuInfoEntity } from './GpuInfoEntity.js';

/** GPU detection has been probed and found a GPU; carries the raw detection result. */
export namespace GpuCacheComputedValueStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'gpu': GpuInfoEntity.Schema,
      'variant': { 'const': 'computed-value', 'type': 'string' }
    },
    'required': ['gpu', 'variant'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
