import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace TokenBucketOptionsEntity {
  export const Schema = {
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'properties': {
      'burstSize': { 'minimum': 1, 'type': 'integer' },
      'requestsPerSecond': { 'exclusiveMinimum': 0, 'type': 'number' }
    },
    'required': ['burstSize', 'requestsPerSecond'],
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
