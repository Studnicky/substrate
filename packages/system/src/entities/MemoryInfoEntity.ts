import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace MemoryInfoEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'freeMb': { 'type': 'number' },
      'totalMb': { 'type': 'number' }
    },
    'required': ['freeMb', 'totalMb'],
    'title': 'MemoryInfoType',
    'type': 'object'
  } as const satisfies JSONSchema;
  export type Type = FromSchema<typeof Schema>;
  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
