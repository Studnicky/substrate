import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types';

import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';

import { EntityIntake } from '../validation/EntityIntake.js';

/** Error with retry-after value (typically in seconds). */
export namespace ErrorWithRetryAfterEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithRetryAfter',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'retryAfter': { 'type': 'number' }
    },
    'required': ['retryAfter'],
    'title': 'ErrorWithRetryAfter',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  /**
   * Structural validator. Hand-written (not `SchemaValidator.compile`) because this
   * package is a dependency of `@studnicky/json`; depending on it here would form a
   * circular workspace reference.
   */
  export const validate: EntityValidateFunctionInterface<Type> = (candidate): candidate is Type => {
    if (!Predicates.isObject(candidate)) { return false; }
    const result = typeof candidate.retryAfter === 'number';
    return result;
  };

  const boundary = EntityIntake.compile<Type>((candidate, options) => {
    if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['retryAfter'])) { return undefined; }
    const retryAfter = EntityIntake.number(candidate.retryAfter, options.coerce);
    if (retryAfter === undefined) { return undefined; }
    const result = { 'retryAfter': retryAfter };
    return result;
  }, 'ErrorWithRetryAfter');

  export const intake = boundary.intake;
  export const create = boundary.create;
}
