import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { AdaptiveConfigEntity } from './AdaptiveConfigEntity.js';

export namespace ThrottleConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'adaptive': {
        ...AdaptiveConfigEntity.Schema,
        'description': 'Adaptive concurrency configuration.'
      },
      'concurrencyLimit': {
        'description': 'Maximum number of concurrent operations.',
        'minimum': 1,
        'type': 'integer'
      }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
