import { type FromSchema, Guard, type JsonSchemaObjectType } from '@studnicky/types';

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
    if (typeof record.message !== 'string') { return false; }
    if (typeof record.path !== 'string') { return false; }
    if (record.details !== undefined && !Guard.isRecord(record.details)) { return false; }
    return true;
  }
}
