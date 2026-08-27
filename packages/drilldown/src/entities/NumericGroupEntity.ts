import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** A single labeled numeric bucket used when discretizing continuous values. */
export namespace NumericGroupEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'label': { 'type': 'string' },
      'maximum': { 'type': 'number' },
      'minimum': { 'type': 'number' }
    },
    'required': ['label', 'maximum', 'minimum'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
