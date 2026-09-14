import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace VisibleRangeConfigDataEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'count': { 'minimum': 0, 'type': 'integer' },
      'itemSize': { 'exclusiveMinimum': 0, 'type': 'number' },
      'overscan': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['count'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /** Serializable inputs accepted by visible-range configuration. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
