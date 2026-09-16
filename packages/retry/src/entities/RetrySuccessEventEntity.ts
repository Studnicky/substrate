import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Schema-validatable snapshot emitted when a retry operation succeeds. */
export namespace RetrySuccessEventEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RetrySuccessEvent',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'attemptNumber': { 'minimum': 0, 'type': 'integer' },
      'elapsedMs': { 'minimum': 0, 'type': 'number' }
    },
    'required': ['attemptNumber', 'elapsedMs'],
    'title': 'RetrySuccessEvent',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
