import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/**
 * One array-logic registry-key (EVERY/SOME/NONE/ONE, or a custom registered name) per
 * array wildcard segment ([*]) in a condition's path.
 */
export namespace GroupGateNamesEntity {
  export const Schema = {
    'items': { 'type': 'string' },
    'type': 'array'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
