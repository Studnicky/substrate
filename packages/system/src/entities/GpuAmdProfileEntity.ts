import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Parsed JSON emitted by `rocm-smi --showmeminfo vram --json`. */
export namespace GpuAmdProfileEntity {
  export const Schema = {
    'additionalProperties': false,
    'minProperties': 1,
    'patternProperties': {
      '.*': {
        'additionalProperties': false,
        'properties': {
          'VRAM Total Memory (B)': { 'type': ['number', 'string'] }
        },
        'type': 'object'
      }
    },
    'title': 'GpuAmdProfile',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
