import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Canonical effect payload for OperationLifecycleMachine's FireOnRelease transition. */
export namespace FireOnReleaseEffectEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'activeCount': {
        'minimum': 0,
        'type': 'integer'
      },
      'totalExecuted': {
        'minimum': 0,
        'type': 'integer'
      },
      'variant': {
        'const': 'FireOnRelease',
        'type': 'string'
      }
    },
    'required': [
      'variant',
      'activeCount',
      'totalExecuted'
    ],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
