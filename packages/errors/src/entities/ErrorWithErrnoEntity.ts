import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types/node';

import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';

import { EntityIntake } from '../validation/EntityIntake.js';

/** Error with system errno. */
export namespace ErrorWithErrnoEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithErrno',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'errno': { 'type': 'number' }
    },
    'required': ['errno'],
    'title': 'ErrorWithErrno',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = (candidate): candidate is Type => {
    if (!Predicates.isObject(candidate)) { return false; }
    const result = Predicates.isNumber(candidate.errno);
    return result;
  };

  const boundary = EntityIntake.compile<Type>((candidate, options) => {
    if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['errno'])) { return undefined; }
    const errno = EntityIntake.number(candidate.errno);
    if (errno === undefined) { return undefined; }
    const result = { 'errno': errno };
    return result;
  }, 'ErrorWithErrno');

  export const intake = boundary.intake;
  export const create = boundary.create;
}
