import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types';

import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';

import { EntityIntake } from '../validation/EntityIntake.js';

/** Error with HTTP status code. */
export namespace ErrorWithStatusEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithStatus',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'status': { 'type': 'number' }
    },
    'required': ['status'],
    'title': 'ErrorWithStatus',
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
    const result = Predicates.isNumber(candidate.status);
    return result;
  };

  const boundary = EntityIntake.compile<Type>((candidate, options) => {
    if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['status'])) { return undefined; }
    const status = EntityIntake.number(candidate.status);
    if (status === undefined) { return undefined; }
    const result = { 'status': status };
    return result;
  }, 'ErrorWithStatus');

  export const intake = boundary.intake;
  export const create = boundary.create;
}
