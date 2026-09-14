import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { GranularityOptionsEntity } from './GranularityOptionsEntity.js';
import { NodeBudgetEntity } from './NodeBudgetEntity.js';

/** Shared mutable state threaded through one grouping pass. */
export namespace EngineContextEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'budget': NodeBudgetEntity.Schema,
      'granularity': GranularityOptionsEntity.Schema,
      'maximumDepth': { 'type': 'integer' },
      'maximumNodes': { 'type': 'integer' },
      'minimumGroupSize': { 'type': 'integer' }
    },
    'required': ['budget', 'minimumGroupSize'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
