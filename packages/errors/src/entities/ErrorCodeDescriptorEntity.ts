import { type FromSchema, Guard, type JsonSchemaObjectType } from '@studnicky/types';

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
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  /**
   * Structural validator. Hand-written (not `SchemaValidator.compile`) because this
   * package is a dependency of `@studnicky/json`; depending on it here would form a
   * circular workspace reference.
   */
  export function validate(candidate: unknown): candidate is Type {
    const record = Guard.asRecord(candidate);
    if (record === undefined) { return false; }
    if (typeof record.code !== 'string') { return false; }
    if (typeof record.description !== 'string') { return false; }
    if (typeof record.retryable !== 'boolean') { return false; }
    return true;
  }
}
