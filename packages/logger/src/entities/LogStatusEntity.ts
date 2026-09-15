import type { EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Universal semantic outcomes for logged operations. */
export namespace LogStatusEntity {
  export const Schema = {
    'description': 'Universal semantic outcome for a logged operation.',
    'enum': [
      'cached', 'complete', 'failed', 'in_progress', 'invalid', 'not_found',
      'partial', 'pending', 'rate_limited', 'retry_exhausted', 'retrying',
      'skipped', 'success', 'timeout', 'unauthorized', 'unavailable'
    ],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
}
