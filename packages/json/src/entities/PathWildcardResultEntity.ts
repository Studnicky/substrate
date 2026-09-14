import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Schema-derived wildcard metadata returned during path traversal. */
export namespace PathWildcardResultEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'isWildcard': { 'const': true },
      'remainingPath': { 'items': { 'type': 'string' }, 'type': 'array' }
    },
    'required': ['isWildcard', 'remainingPath'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
