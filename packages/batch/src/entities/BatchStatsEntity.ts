import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace BatchStatsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'failed': { 'minimum': 0, 'type': 'integer' },
      'succeeded': { 'minimum': 0, 'type': 'integer' },
      'total': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['failed', 'succeeded', 'total'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Aggregate completion statistics emitted by the onBatchComplete hook. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
