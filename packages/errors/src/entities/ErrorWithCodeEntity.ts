import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types/node';

import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';

import { EntityIntake } from '../validation/EntityIntake.js';

/** Error with string code (e.g., 'ECONNREFUSED', 'ETIMEDOUT'). */
export namespace ErrorWithCodeEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithCode',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'code': { 'type': 'string' }
    },
    'required': ['code'],
    'title': 'ErrorWithCode',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = (candidate): candidate is Type => {
    if (!Predicates.isObject(candidate)) { return false; }
    const result = Predicates.isString(candidate.code);
    return result;
  };

  const boundary = EntityIntake.compile<Type>((candidate, options) => {
    if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['code'])) { return undefined; }
    const code = EntityIntake.string(candidate.code);
    if (code === undefined) { return undefined; }
    const result = { 'code': code };
    return result;
  }, 'ErrorWithCode');

  export const intake = boundary.intake;
  export const create = boundary.create;
}
