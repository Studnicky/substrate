import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Decomposed semantic version components. */
export namespace ParsedSemverEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'major': { 'type': 'integer' },
      'minor': { 'type': 'integer' },
      'patch': { 'type': 'integer' },
      'prerelease': { 'type': 'string' }
    },
    'required': ['major', 'minor', 'patch', 'prerelease'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
