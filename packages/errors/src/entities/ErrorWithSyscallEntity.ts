import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types/node';

import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';

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

  export const validate: EntityValidateFunctionInterface<Type> = (candidate): candidate is Type => {
    if (!Predicates.isObject(candidate)) { return false; }
    const result = Predicates.isString(candidate.syscall);
    return result;
  };

  const boundary = EntityIntake.compile<Type>((candidate, options) => {
    if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['syscall'])) { return undefined; }
    const syscall = EntityIntake.string(candidate.syscall);
    if (syscall === undefined) { return undefined; }
    const result = { 'syscall': syscall };
    return result;
  }, 'ErrorWithSyscall');

  export const intake = boundary.intake;
  export const create = boundary.create;
}
