import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Declarative string-based time range boundaries for filter configuration. */
export namespace TimeRangeEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'inclusive': { 'type': 'boolean' },
      'maximum': { 'type': 'string' },
      'minimum': { 'type': 'string' }
    },
    'required': ['maximum', 'minimum'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
