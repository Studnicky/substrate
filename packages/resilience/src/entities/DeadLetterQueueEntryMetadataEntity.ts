import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

/** Canonical metadata attached to one dead-letter queue entry. */
export namespace DeadLetterQueueEntryMetadataEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'enqueuedAtMs': { 'minimum': 0, 'type': 'number' },
      'id': { 'minLength': 1, 'type': 'string' },
      'reason': { 'minLength': 1, 'type': 'string' }
    },
    'required': ['enqueuedAtMs', 'id', 'reason'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
