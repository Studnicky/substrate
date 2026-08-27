import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Decomposed semantic version components. */
export namespace ParsedSemverEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'major': { 'type': 'integer' },
      'minor': { 'type': 'integer' },
      'patch': { 'type': 'integer' },
      'prerelease': { 'type': 'string' }
    },
    'required': ['major', 'minor', 'patch', 'prerelease'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
