import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Canonical effect payload for OperationLifecycleMachine's FireOnAdaptiveAdjust transition. */
export namespace FireOnAdaptiveAdjustEffectEntity {
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
      'variant': {
        'const': 'FireOnAdaptiveAdjust',
        'type': 'string'
      }
    },
    'required': [
      'variant',
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
