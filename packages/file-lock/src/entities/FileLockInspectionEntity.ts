import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace FileLockInspectionEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'lockPath': { 'minLength': 1, 'type': 'string' },
      'originalPath': { 'minLength': 1, 'type': 'string' },
      'ownerToken': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['lockPath', 'originalPath', 'ownerToken'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
