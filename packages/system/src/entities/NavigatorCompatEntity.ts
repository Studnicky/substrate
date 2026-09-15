import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace NavigatorCompatEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'deviceMemory': { 'type': 'number' },
      'hardwareConcurrency': { 'type': 'number' },
      'userAgent': { 'type': 'string' },
      'userAgentData': {
        'additionalProperties': false,
        'properties': {
          'platform': { 'type': 'string' }
        },
        'type': 'object'
      }
    },
    'title': 'NavigatorCompat',
    'type': 'object'
  } as const satisfies JSONSchema;
  export type Type = FromSchema<typeof Schema>;
  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
