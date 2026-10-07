import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace GpuInfoEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'computeApi': { 'enum': ['cuda', 'metal', 'opencl', 'software'], 'type': 'string' },
      'name': { 'type': 'string' },
      'vramMb': { 'type': ['number', 'null'] }
    },
    'required': ['computeApi', 'name', 'vramMb'],
    'title': 'GpuInfoType',
    'type': 'object'
  } as const satisfies JSONSchema;
  export type Type = FromSchema<typeof Schema>;
  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
