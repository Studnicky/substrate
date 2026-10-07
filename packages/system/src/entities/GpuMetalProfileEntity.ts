import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Parsed JSON emitted by `system_profiler SPDisplaysDataType -json`. */
export namespace GpuMetalProfileEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'SPDisplaysDataType': {
        'items': {
          'additionalProperties': false,
          'properties': {
            'spdisplays_vram': { 'type': ['number', 'string'] },
            'sppci_model': { 'type': ['number', 'string'] }
          },
          'type': 'object'
        },
        'minItems': 1,
        'type': 'array'
      }
    },
    'required': ['SPDisplaysDataType'],
    'title': 'GpuMetalProfile',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
