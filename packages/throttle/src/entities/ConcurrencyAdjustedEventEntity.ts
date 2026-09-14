import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Canonical event payload for OperationLifecycleMachine's ConcurrencyAdjusted transition. */
export namespace ConcurrencyAdjustedEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'newLimit': {
        'minimum': 0,
        'type': 'integer'
      },
      'previousLimit': {
        'minimum': 0,
        'type': 'integer'
      },
      'type': {
        'const': 'ConcurrencyAdjusted',
        'type': 'string'
      }
    },
    'required': [
      'type',
      'newLimit',
      'previousLimit'
    ],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
