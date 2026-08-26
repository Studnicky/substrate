import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types';

import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';

import { EntityIntake } from '../validation/EntityIntake.js';

/** Human-readable diagnostic fields exposed by Error-compatible contracts. */
export namespace ErrorDiagnosticEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorDiagnostic',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'message': { 'type': 'string' },
      'name': { 'type': 'string' },
      'stack': { 'type': 'string' }
    },
    'required': ['message', 'name'],
    'title': 'ErrorDiagnostic',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  /** Validates the schema-backed diagnostic fields without introducing a json-package cycle. */
  export const validate: EntityValidateFunctionInterface<Type> = (candidate): candidate is Type => {
    if (!Predicates.isObject(candidate)) { return false; }
    if (!Predicates.isString(candidate.message) || !Predicates.isString(candidate.name)) { return false; }
    const result = candidate.stack === undefined || Predicates.isString(candidate.stack);
    return result;
  };

  class Parser {
    public static parse(candidate: Record<string, unknown>, options: EntityIntake.ParseOptionsInterface): Type | undefined {
      if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['message', 'name', 'stack'])) { return undefined; }
      const message = EntityIntake.string(candidate.message);
      const name = EntityIntake.string(candidate.name);
      if (message === undefined || name === undefined) { return undefined; }
      if (candidate.stack === undefined) { return { 'message': message, 'name': name }; }
      const stack = EntityIntake.string(candidate.stack);
      if (stack === undefined) { return undefined; }
      const result = { 'message': message, 'name': name, 'stack': stack };
      return result;
    }
  }

  export const intake = EntityIntake.compileIntake(Parser.parse, 'ErrorDiagnostic');
  export const create = EntityIntake.compileCreate(Parser.parse, 'ErrorDiagnostic');
}
