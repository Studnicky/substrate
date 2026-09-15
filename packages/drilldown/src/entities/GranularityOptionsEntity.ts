import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { DateGranularityValueEntity } from './DateGranularityValueEntity.js';

/** Fine-grained configuration for grouping bucket sizes. */
export namespace GranularityOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'cidr': { 'type': 'integer' },
      'count': { 'type': 'integer' },
      'date': DateGranularityValueEntity.Schema,
      'density': { 'type': 'number' },
      'prefix': { 'type': 'integer' }
    },
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
