import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace ContextLookupEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'found': { 'type': 'boolean' },
      'value': {}
    },
    'required': ['found', 'value'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Presence-aware result returned by a non-throwing context lookup. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
