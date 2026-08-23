import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { Guard } from '@studnicky/types';

import { EntityIntake } from '../validation/EntityIntake.js';

/**
 * Error classification result.
 *
 * Classifiers determine IF an error should be retried.
 * Backoff strategies determine HOW LONG to wait between retries.
 */
export namespace ErrorClassificationEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorClassification',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'reason': {
        'description': 'Optional reason for classification (for logging/debugging)',
        'type': 'string'
      },
      'retryable': {
        'description': 'Whether this error should trigger a retry',
        'type': 'boolean'
      }
    },
    'required': ['retryable'],
    'title': 'ErrorClassification',
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
    if (typeof candidate.retryable !== 'boolean') { return false; }
    if (candidate.reason !== undefined && typeof candidate.reason !== 'string') { return false; }
    return true;
  };

  const parser = (candidate: Record<string, unknown>, options: EntityIntake.ParseOptionsInterface): Type | undefined => {
    if (options.rejectUnknownProperties && !EntityIntake.hasOnlyKeys(candidate, ['reason', 'retryable'])) { return undefined; }
    const retryable = EntityIntake.boolean(candidate.retryable, options.coerce);
    if (retryable === undefined) { return undefined; }
    if (candidate.reason === undefined) { return { 'retryable': retryable }; }
    const reason = EntityIntake.string(candidate.reason, options.coerce);
    return reason === undefined ? undefined : { 'reason': reason, 'retryable': retryable };
  };

  export const intake = EntityIntake.compileIntake(parser, 'ErrorClassification');
  export const create = EntityIntake.compileCreate(parser, 'ErrorClassification');
}
