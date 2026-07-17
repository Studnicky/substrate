import { type FromSchema, Guard, type JsonSchemaObjectType } from '@studnicky/types';

/** Error with system errno. */
export namespace ErrorWithErrnoEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ErrorWithErrno',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'errno': { 'type': 'number' }
    },
    'required': ['errno'],
    'title': 'ErrorWithErrno',
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
    return typeof record.errno === 'number';
  }
}
