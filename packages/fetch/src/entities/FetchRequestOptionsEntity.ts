import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

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

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
