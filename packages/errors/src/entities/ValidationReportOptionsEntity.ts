import { type FromSchema, Guard, type JsonSchemaObjectType } from '@studnicky/types';

/** Overrides applied when generating an RFC 7807 Problem Details payload. */
export namespace ValidationReportOptionsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ValidationReportOptions',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'status': {
        'description': "HTTP status code (defaults to '422').",
        'type': 'number'
      },
      'title': {
        'description': "Human-readable title (defaults to 'Validation failed').",
        'type': 'string'
      },
      'type': {
        'description': "Problem type URI (defaults to 'https://problems.studnicky.dev/validation').",
        'type': 'string'
      }
    },
    'title': 'ValidationReportOptions',
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
    if (record.status !== undefined && typeof record.status !== 'number') { return false; }
    if (record.title !== undefined && typeof record.title !== 'string') { return false; }
    if (record.type !== undefined && typeof record.type !== 'string') { return false; }
    return true;
  }
}
