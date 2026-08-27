import type { SchemaCreateFunctionInterface, SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

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

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
  export const create: SchemaCreateFunctionInterface<Type> = SchemaValidator.compileCreate<Type>(Schema);
}
