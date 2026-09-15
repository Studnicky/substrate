import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace TimingEventDataEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'event': {
        'description': "The formatted event name. Format: 'component.operation' or 'component.operation.status'",
        'type': 'string'
      }
    },
    'required': ['event'],
    'type': 'object'
  } as const satisfies JSONSchema;

  /**
   * Output of TimingEvent.create().
   * Represents a fully validated timing event.
   */
  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
