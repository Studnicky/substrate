import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace MutexConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'enableCoalescing': { 'default': false, 'type': 'boolean' },
      'maximumQueueSize': { 'default': 0, 'minimum': 0, 'type': 'integer' },
      'timeout': { 'default': 0, 'minimum': 0, 'type': 'integer' }
    },
    'propertyNames': {
      'enum': ['enableCoalescing', 'maximumQueueSize', 'timeout']
    },
    'required': ['enableCoalescing', 'maximumQueueSize', 'timeout'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Mutex configuration options. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
