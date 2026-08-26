import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types';

import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';

import { EntityIntake } from '../validation/EntityIntake.js';

/** Describes one validation failure from a schema check, with optional structured details. */
export namespace ValidationViolationDetailEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationViolationDetail',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'details': {
        'description': 'Additional structured details about the violation.',
        'type': 'object'
      },
      'message': {
        'description': 'Human-readable description of the failure.',
        'type': 'string'
      },
      'path': {
        'description': "JSON Pointer or dot-path to the failing field (e.g. '/user/email').",
        'type': 'string'
      }
    },
    'required': ['message', 'path'],
    'title': 'ValidationViolationDetail',
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
    if (!Predicates.isString(candidate.message)) { return false; }
    if (!Predicates.isString(candidate.path)) { return false; }
    if (candidate.details !== undefined && !Predicates.isObject(candidate.details)) { return false; }
    return true;
  };

  class Parser {
    public static parse(candidate: Record<string, unknown>, options: EntityIntake.ParseOptionsInterface): Type | undefined {
      if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['details', 'message', 'path'])) { return undefined; }
      const message = EntityIntake.string(candidate.message);
      const path = EntityIntake.string(candidate.path);
      if (message === undefined || path === undefined) { return undefined; }
      if (candidate.details === undefined) { return { 'message': message, 'path': path }; }
      if (!Predicates.isObject(candidate.details)) { return undefined; }
      return { 'details': candidate.details, 'message': message, 'path': path };
    }
  }

  export const intake = EntityIntake.compileIntake(Parser.parse, 'ValidationViolationDetail');
  export const create = EntityIntake.compileCreate(Parser.parse, 'ValidationViolationDetail');
}
