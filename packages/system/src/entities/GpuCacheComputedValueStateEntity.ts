import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

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

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
