import type {
  SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface
} from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type {
  FromSchema, JSONSchema
} from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Validated options for acquiring a browser Web Lock. */
export namespace WebLockOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'name': {
        'minLength': 1, 'type': 'string'
      }
    },
    'required': ['name'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
}
