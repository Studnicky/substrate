import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Detected shared-prefix/suffix numeric sequence pattern across a set of string values. */
export namespace SequentialPatternResultEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'density': { 'type': 'number' },
      'maximum': { 'type': 'integer' },
      'minimum': { 'type': 'integer' },
      'padding': { 'type': 'integer' },
      'prefix': { 'type': 'string' },
      'suffix': { 'type': 'string' }
    },
    'required': ['density', 'maximum', 'minimum', 'padding', 'prefix', 'suffix'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
