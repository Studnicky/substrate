import { type FromSchema, Guard, type JsonSchemaObjectType } from '@studnicky/types';

/** Error with HTTP status code (alternative property name). */
export namespace ErrorWithStatusCodeEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithStatusCode',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'statusCode': { 'type': 'number' }
    },
    'required': ['statusCode'],
    'title': 'ErrorWithStatusCode',
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
    return typeof record.statusCode === 'number';
  }
}
