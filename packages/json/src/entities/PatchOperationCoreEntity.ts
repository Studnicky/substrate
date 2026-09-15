import type { EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Schema-derived RFC-6902 operation fields shared by every wire variant. */
export namespace PatchOperationCoreEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'from': { 'type': 'string' },
      'op': { 'enum': ['add', 'copy', 'move', 'remove', 'replace', 'test'] },
      'path': { 'type': 'string' }
    },
    'required': ['op', 'path'],
    'title': 'PatchOperationCore',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake = EntityCompiler.compileIntake<Type>(Schema);
  export const create = EntityCompiler.compileCreate<Type>(Schema);
}
