import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Guard } from '@studnicky/types';

import { EntityIntake } from '../validation/EntityIntake.js';

/** Error with address information. */
export namespace ErrorWithAddressEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithAddress',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'address': { 'type': 'string' }
    },
    'required': ['address'],
    'title': 'ErrorWithAddress',
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
    const result = typeof candidate.address === 'string';
    return result;
  };

  export const intake = (input: unknown): Type => {return EntityIntake.intake(input, (candidate, options) => {
    const address = EntityIntake.string(candidate.address, options.coerce);
    return address === undefined ? undefined : { 'address': address };
  }, 'ErrorWithAddress');};

  export const create = (partial: Partial<Type> = {}): Type => {return EntityIntake.create(partial, (candidate, options) => {
    if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['address'])) { return undefined; }
    const address = EntityIntake.string(candidate.address, options.coerce);
    return address === undefined ? undefined : { 'address': address };
  }, 'ErrorWithAddress');};
}
