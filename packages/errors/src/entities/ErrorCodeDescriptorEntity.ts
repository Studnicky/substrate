import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Guard } from '@studnicky/types';

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
  export const validate = (candidate: unknown): candidate is Type => {
    if (!Guard.isObject(candidate)) { return false; }
    if (typeof candidate.code !== 'string') { return false; }
    if (typeof candidate.description !== 'string') { return false; }
    if (typeof candidate.retryable !== 'boolean') { return false; }
    return true;
  };

  const parser = (candidate: Record<string, unknown>, options: EntityIntake.ParseOptionsInterface): Type | undefined => {
    if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['code', 'description', 'retryable'])) { return undefined; }
    const code = EntityIntake.string(candidate.code, options.coerce);
    const description = EntityIntake.string(candidate.description, options.coerce);
    const retryable = EntityIntake.boolean(candidate.retryable, options.coerce);
    if (code === undefined || description === undefined || retryable === undefined) { return undefined; }
    return { 'code': code, 'description': description, 'retryable': retryable };
  };

  export const intake = EntityIntake.compileIntake(parser, 'ErrorCodeDescriptor');
  export const create = EntityIntake.compileCreate(parser, 'ErrorCodeDescriptor');
}
