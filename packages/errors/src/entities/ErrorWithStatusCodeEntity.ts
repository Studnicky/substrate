import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Guard } from '@studnicky/types';

import { EntityIntake } from '../validation/EntityIntake.js';

/** Error with HTTP status code (alternative property name). */
export namespace ErrorWithStatusCodeEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithStatusCode',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'statusCode': { 'type': 'number' }
    },
    'required': ['statusCode'],
    'title': 'ErrorWithStatusCode',
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
    const result = typeof candidate.statusCode === 'number';
    return result;
  };

  export const intake = (input: unknown): Type => {return EntityIntake.intake(input, (candidate, options) => {
    const statusCode = EntityIntake.number(candidate.statusCode, options.coerce);
    return statusCode === undefined ? undefined : { 'statusCode': statusCode };
  }, 'ErrorWithStatusCode');};

  export const create = (partial: Partial<Type> = {}): Type => {return EntityIntake.create(partial, (candidate, options) => {
    if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['statusCode'])) { return undefined; }
    const statusCode = EntityIntake.number(candidate.statusCode, options.coerce);
    return statusCode === undefined ? undefined : { 'statusCode': statusCode };
  }, 'ErrorWithStatusCode');};
}
