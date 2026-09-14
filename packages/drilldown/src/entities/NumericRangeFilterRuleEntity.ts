import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Filter rule matching records by numeric range. */
export namespace NumericRangeFilterRuleEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'maximum': { 'type': 'number' },
      'minimum': { 'type': 'number' },
      'property': { 'type': 'string' },
      'type': { 'const': 'numeric' }
    },
    'required': ['property', 'type'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
