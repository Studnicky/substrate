import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

import { RequestDeadlineEntity } from './RequestDeadlineEntity.js';

/** Serializable configuration retained by a request executor. */
export namespace RequestExecutorConfigDataEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RequestExecutorConfigData',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'deadlineMs': RequestDeadlineEntity.Schema.properties.deadlineMs
    },
    'title': 'RequestExecutorConfigData',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
