import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace RetryConfigEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/RetryConfig',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Configuration for request retry behavior',
    'properties': {
      'maxRetries': {
        'description': 'Maximum number of retry attempts',
        'minimum': 0,
        'type': 'integer'
      }
    },
    'title': 'RetryConfig',
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  /** JSON-serializable configuration shape. Contains only schema-validatable members. */
  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
