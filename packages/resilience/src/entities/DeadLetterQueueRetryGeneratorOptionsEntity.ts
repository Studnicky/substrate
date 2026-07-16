import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace DeadLetterQueueRetryGeneratorOptionsEntity {
  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'intervalMs': { 'minimum': 0, 'type': 'integer' }
    },
    'required': ['intervalMs'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
