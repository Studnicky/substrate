import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Guard } from '@studnicky/types';

import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';

import { EntityIntake } from '../validation/EntityIntake.js';

/** Describes one validation failure from a schema check. */
export namespace ValidationViolationEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationViolation',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'keyword': {
        'description': "Validation keyword that triggered the failure (e.g. 'required', 'minLength').",
        'type': 'string'
      },
      'message': {
        'description': 'Human-readable description of the failure.',
        'type': 'string'
      },
      'path': {
        'description': "JSON Pointer or field name of the failing field (e.g. '/user/email').",
        'type': 'string'
      }
    },
    'required': ['keyword', 'message', 'path'],
    'title': 'ValidationViolation',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  /**
   * Structural validator. Hand-written (not `SchemaValidator.compile`) because this
   * package is a dependency of `@studnicky/json`; depending on it here would form a
   * circular workspace reference.
   */
  export const validate: EntityValidateFunctionInterface<Type> = (candidate): candidate is Type => {
    if (!Guard.isObject(candidate)) { return false; }
    if (typeof candidate.keyword !== 'string') { return false; }
    if (typeof candidate.message !== 'string') { return false; }
    if (typeof candidate.path !== 'string') { return false; }
    return true;
  };

  class Parser {
    public static parse(candidate: Record<string, unknown>, options: EntityIntake.ParseOptionsInterface): Type | undefined {
      if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['keyword', 'message', 'path'])) { return undefined; }
      const keyword = EntityIntake.string(candidate.keyword, options.coerce);
      const message = EntityIntake.string(candidate.message, options.coerce);
      const path = EntityIntake.string(candidate.path, options.coerce);
      if (keyword === undefined || message === undefined || path === undefined) { return undefined; }
      return { 'keyword': keyword, 'message': message, 'path': path };
    }
  }

  export const intake = EntityIntake.compileIntake(Parser.parse, 'ValidationViolation');
  export const create = EntityIntake.compileCreate(Parser.parse, 'ValidationViolation');
}
