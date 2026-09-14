import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace VisibleRangeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'end': { 'type': 'number' },
      'start': { 'type': 'number' }
    },
    'required': ['end', 'start'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Inclusive `[start, end]` index range of currently visible items. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
