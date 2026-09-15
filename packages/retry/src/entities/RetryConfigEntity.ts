import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace RetryConfigEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RetryConfig',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Configuration for request retry behavior',
    'properties': {
      'hookTimeoutMs': {
        'description': 'When set, races each lifecycle hook against this timeout (ms); a hook that neither resolves nor rejects in time is treated as a failure',
        'exclusiveMinimum': 0,
        'type': 'integer'
      },
      'maximumElapsedMs': {
        'description': 'Maximum total elapsed time across all attempts (ms)',
        'minimum': 0,
        'type': 'integer'
      },
      'maximumRetries': {
        'description': 'Maximum number of retry attempts',
        'minimum': 0,
        'type': 'integer'
      }
    },
    'title': 'RetryConfig',
    'type': 'object'
  } as const satisfies JSONSchema;

  /** JSON-serializable retry configuration fields. */
  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
