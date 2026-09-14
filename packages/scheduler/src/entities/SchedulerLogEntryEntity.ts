import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace SchedulerLogEntryEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/SchedulerLogEntry',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'A single lifecycle event recorded by a logging scheduler.',
    'properties': {
      'event': {
        'enum': ['schedule', 'fire'],
        'type': 'string'
      },
      'id': {
        'type': 'string'
      }
    },
    'required': ['event', 'id'],
    'title': 'SchedulerLogEntry',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
