import type { SchemaIntakeFunctionInterface } from '@studnicky/json/interfaces';
import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

/** Canonical release path recorded on `OperationLifecycleEvent`'s `SlotReleased` variant. */
export namespace SlotReleasedOutcomeEntity {
  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'enum': ['became-idle', 'handoff-granted', 'still-busy'],
    'type': 'string'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
  export const intake: SchemaIntakeFunctionInterface<Type> = SchemaValidator.compileIntake<Type>(Schema);
}
