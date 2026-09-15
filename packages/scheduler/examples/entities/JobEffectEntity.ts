import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace JobEffectEntity {
  export const Schema = {
    'oneOf': [
      {
        'additionalProperties': false,
        'properties': {
          'delayMs': { 'type': 'number' },
          'variant': { 'const': 'scheduleAdvance', 'type': 'string' }
        },
        'required': ['delayMs', 'variant'],
        'type': 'object'
      },
      {
        'additionalProperties': false,
        'properties': {
          'variant': { 'const': 'requestAck', 'type': 'string' }
        },
        'required': ['variant'],
        'type': 'object'
      }
    ]
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
