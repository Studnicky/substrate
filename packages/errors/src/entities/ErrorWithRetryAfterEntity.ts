import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Guard } from '@studnicky/types';

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
  export const validate = (candidate: unknown): candidate is Type => {
    if (!Guard.isObject(candidate)) { return false; }
    const result = typeof candidate.retryAfter === 'number';
    return result;
  };

  export const intake = (input: unknown): Type => {return EntityIntake.intake(input, (candidate, options) => {
    const retryAfter = EntityIntake.number(candidate.retryAfter, options.coerce);
    return retryAfter === undefined ? undefined : { 'retryAfter': retryAfter };
  }, 'ErrorWithRetryAfter');};

  export const create = (partial: Partial<Type> = {}): Type => {return EntityIntake.create(partial, (candidate, options) => {
    if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['retryAfter'])) { return undefined; }
    const retryAfter = EntityIntake.number(candidate.retryAfter, options.coerce);
    return retryAfter === undefined ? undefined : { 'retryAfter': retryAfter };
  }, 'ErrorWithRetryAfter');};
}
