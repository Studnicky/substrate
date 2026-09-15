import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/**
 * String-literal union of all valid temporal granularity values.
 * Use this type for parameters and config fields; use DateGranularity enum
 * as a convenience for building values.
 */
export namespace DateGranularityValueEntity {
  export const Schema = {
    'enum': ['day', 'month', 'quarter', 'week', 'year'],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
