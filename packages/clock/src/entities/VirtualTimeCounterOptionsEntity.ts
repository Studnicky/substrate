/**
 * Schema-validated options entity for `VirtualTimeCounter`.
 *
 * @module
 */
import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace VirtualTimeCounterOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'startMs': { 'default': 0, 'minimum': 0, 'type': 'number' }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Construction options for {@link VirtualTimeCounter}. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
