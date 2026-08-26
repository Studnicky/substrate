import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Predicates } from '@studnicky/types';

import type { EntityValidateFunctionInterface } from '../interfaces/EntityValidateFunctionInterface.js';

import { EntityIntake } from '../validation/EntityIntake.js';

/** Describes a registered error code entry in `ErrorCodeRegistry`. */
export namespace ErrorCodeDescriptorEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorCodeDescriptor',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'code': {
        'description': "Dotted camelCase error code (e.g. 'errors.validationFailed').",
        'type': 'string'
      },
      'description': {
        'description': 'Human-readable description of what this code represents.',
        'type': 'string'
      },
      'retryable': {
        'description': 'Whether errors with this code should be retried.',
        'type': 'boolean'
      }
    },
    'required': ['code', 'description', 'retryable'],
    'title': 'ErrorCodeDescriptor',
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
    if (!Predicates.isString(candidate.code)) { return false; }
    if (!Predicates.isString(candidate.description)) { return false; }
    if (!Predicates.isBoolean(candidate.retryable)) { return false; }
    return true;
  };

  class Parser {
    public static parse(candidate: Record<string, unknown>, options: EntityIntake.ParseOptionsInterface): Type | undefined {
      if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['code', 'description', 'retryable'])) { return undefined; }
      const code = EntityIntake.string(candidate.code);
      const description = EntityIntake.string(candidate.description);
      const retryable = EntityIntake.boolean(candidate.retryable);
      if (code === undefined || description === undefined || retryable === undefined) { return undefined; }
      return { 'code': code, 'description': description, 'retryable': retryable };
    }
  }

  export const intake = EntityIntake.compileIntake(Parser.parse, 'ErrorCodeDescriptor');
  export const create = EntityIntake.compileCreate(Parser.parse, 'ErrorCodeDescriptor');
}
