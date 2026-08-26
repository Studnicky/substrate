import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

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

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
