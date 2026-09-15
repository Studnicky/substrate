import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Running minimum/maximum accumulator while scanning a property's values for bounds. */
export namespace BoundsAccumulatorEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'dateMaximum': { 'type': ['number', 'null'] },
      'dateMinimum': { 'type': ['number', 'null'] },
      'numberMaximum': { 'type': ['number', 'null'] },
      'numberMinimum': { 'type': ['number', 'null'] }
    },
    'required': ['dateMaximum', 'dateMinimum', 'numberMaximum', 'numberMinimum'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
