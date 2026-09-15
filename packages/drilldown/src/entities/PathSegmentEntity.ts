import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { GroupNodeValueEntity } from './GroupNodeValueEntity.js';

/** Single segment in a path from root to a specific node. */
export namespace PathSegmentEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'property': { 'type': 'string' },
      'value': GroupNodeValueEntity.Schema
    },
    'required': ['property', 'value'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
