import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Schema-derived status fields returned after applying a patch. */
export namespace PatchApplyResultStatusEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'error': { 'type': 'string' },
      'success': { 'type': 'boolean' }
    },
    'required': ['success'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
