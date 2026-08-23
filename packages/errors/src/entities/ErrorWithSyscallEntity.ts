import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Guard } from '@studnicky/types';

import { EntityIntake } from '../validation/EntityIntake.js';

/** Error with syscall information. */
export namespace ErrorWithSyscallEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithSyscall',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'syscall': { 'type': 'string' }
    },
    'required': ['syscall'],
    'title': 'ErrorWithSyscall',
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
    const result = typeof candidate.syscall === 'string';
    return result;
  };

  export const intake = (input: unknown): Type => {return EntityIntake.intake(input, (candidate, options) => {
    const syscall = EntityIntake.string(candidate.syscall, options.coerce);
    return syscall === undefined ? undefined : { 'syscall': syscall };
  }, 'ErrorWithSyscall');};

  export const create = (partial: Partial<Type> = {}): Type => {return EntityIntake.create(partial, (candidate, options) => {
    if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['syscall'])) { return undefined; }
    const syscall = EntityIntake.string(candidate.syscall, options.coerce);
    return syscall === undefined ? undefined : { 'syscall': syscall };
  }, 'ErrorWithSyscall');};
}
