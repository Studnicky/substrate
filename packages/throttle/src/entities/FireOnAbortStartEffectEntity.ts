import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Canonical effect payload for OperationLifecycleMachine's FireOnAbortStart transition. */
export namespace FireOnAbortStartEffectEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'cancelledCount': {
        'minimum': 0,
        'type': 'integer'
      },
      'variant': {
        'const': 'FireOnAbortStart',
        'type': 'string'
      }
    },
    'required': [
      'variant',
      'cancelledCount'
    ],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
