import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace FetchRequestOptionsEntity {
  export const Schema = {
    'additionalProperties': true,
    'properties': {
      'cache': { 'enum': ['default', 'force-cache', 'no-cache', 'no-store', 'only-if-cached', 'reload'] },
      'credentials': { 'enum': ['include', 'omit', 'same-origin'] },
      'headers': {
        'additionalProperties': false,
        'patternProperties': { '^.*$': { 'type': 'string' } },
        'type': 'object'
      },
      'integrity': { 'type': 'string' },
      'keepalive': { 'type': 'boolean' },
      'metadata': { 'type': 'object' },
      'method': { 'type': 'string' },
      'mode': { 'enum': ['cors', 'navigate', 'no-cors', 'same-origin'] },
      'redirect': { 'enum': ['error', 'follow', 'manual'] },
      'referrer': { 'type': 'string' },
      'referrerPolicy': {
        'enum': ['', 'no-referrer', 'no-referrer-when-downgrade', 'origin', 'origin-when-cross-origin', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin', 'unsafe-url']
      },
      'requestId': { 'type': 'string' },
      'timeout': { 'exclusiveMinimum': 0, 'type': 'number' }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
