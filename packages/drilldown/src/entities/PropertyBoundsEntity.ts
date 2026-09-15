import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Minimum/maximum profile for ordered property types discovered across a record set. */
export namespace PropertyBoundsEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'maximum': { 'type': 'number' },
          'minimum': { 'type': 'number' },
          'type': { 'const': 'number' }
        },
        'required': ['maximum', 'minimum', 'type'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'maximum': { 'type': 'number' },
          'minimum': { 'type': 'number' },
          'type': { 'const': 'date' }
        },
        'required': ['maximum', 'minimum', 'type'],
        'type': 'object'
      }
    ]
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
