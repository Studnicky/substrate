import { SchemaValidator, type ValidateFunction } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace TimingOptionsEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'maxEvents': {
        'description': 'Maximum number of events to store. Positive integer or null (sentinel for Infinity).',
        'oneOf': [
          { 'minimum': 1, 'type': 'integer' },
          { 'type': 'null' }
        ]
      },
      'precision': {
        'additionalProperties': { 'maximum': 20, 'minimum': 0, 'type': 'integer' },
        'description': 'Decimal precision configuration per time unit (h, m, ms, ns, s).',
        'type': 'object'
      }
    },
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type PrecisionConfigType = {
    'h'?: number;
    'm'?: number;
    'ms'?: number;
    'ns'?: number;
    's'?: number;
  };

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
