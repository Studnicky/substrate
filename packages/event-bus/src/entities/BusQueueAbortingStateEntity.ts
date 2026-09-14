import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/**
 * Abort has been requested while a drain loop was in flight; the loop
 * finishes (or abandons) its current entry, then exits without starting on
 * any further entry.
 */
export namespace BusQueueAbortingStateEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'variant': { 'const': 'aborting', 'type': 'string' }
    },
    'required': ['variant'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
