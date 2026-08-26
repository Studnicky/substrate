import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

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

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
