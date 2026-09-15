import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { ContextScopeVariantEntity } from './ContextScopeVariantEntity.js';

/** Canonical lifecycle transition request for a Context scope. */
export namespace ContextScopeTransitionEventEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'to': ContextScopeVariantEntity.Schema,
      'type': { 'const': 'transitionTo', 'type': 'string' }
    },
    'required': ['to', 'type'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
