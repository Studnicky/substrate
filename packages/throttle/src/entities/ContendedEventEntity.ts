import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Canonical event payload for OperationLifecycleMachine's Contended transition. */
export namespace ContendedEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'activeCount': {
        'minimum': 0,
        'type': 'integer'
      },
      'queuedCount': {
        'minimum': 0,
        'type': 'integer'
      },
      'type': {
        'const': 'Contended',
        'type': 'string'
      }
    },
    'required': [
      'type',
      'activeCount',
      'queuedCount'
    ],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
