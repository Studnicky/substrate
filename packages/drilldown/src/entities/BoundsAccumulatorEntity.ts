import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Running minimum/maximum accumulator while scanning a property's values for bounds. */
export namespace BoundsAccumulatorEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'dateMaximum': { 'type': ['number', 'null'] },
      'dateMinimum': { 'type': ['number', 'null'] },
      'numberMaximum': { 'type': ['number', 'null'] },
      'numberMinimum': { 'type': ['number', 'null'] }
    },
    'required': ['dateMaximum', 'dateMinimum', 'numberMaximum', 'numberMinimum'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
