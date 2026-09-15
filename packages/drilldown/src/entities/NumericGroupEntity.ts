import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** A single labeled numeric bucket used when discretizing continuous values. */
export namespace NumericGroupEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'label': { 'type': 'string' },
      'maximum': { 'type': 'number' },
      'minimum': { 'type': 'number' }
    },
    'required': ['label', 'maximum', 'minimum'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
