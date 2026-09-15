import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace EntryEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'mtimeMs': { 'type': 'number' },
      'shape': { 'enum': ['directory', 'file'], 'type': 'string' }
    },
    'required': ['mtimeMs', 'shape'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Internal directory/file entry metadata tracked by `VirtualFileSystem`. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
