import { ConfigurationError } from '@studnicky/config';
import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

import type { AdaptiveConfigEntity } from './AdaptiveConfigEntity.js';

export namespace ThrottleConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'adaptive': {
        'description': 'Adaptive concurrency configuration.',
        'properties': {
          'adjustmentInterval': { 'minimum': 1, 'type': 'integer' },
          'enabled': { 'type': 'boolean' },
          'maxConcurrency': { 'minimum': 1, 'type': 'integer' },
          'minConcurrency': { 'minimum': 1, 'type': 'integer' },
          'sampleWindow': { 'minimum': 1, 'type': 'integer' },
          'scaleDownThreshold': { 'exclusiveMinimum': 0, 'type': 'number' },
          'scaleUpThreshold': { 'exclusiveMinimum': 0, 'type': 'number' },
          'stepSize': { 'minimum': 1, 'type': 'integer' },
          'targetLatencyMs': { 'exclusiveMinimum': 0, 'type': 'number' }
        },
        'required': ['enabled'],
        'type': 'object'
      },
      'concurrencyLimit': {
        'description': 'Maximum number of concurrent operations.',
        'minimum': 1,
        'type': 'integer'
      }
    },
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export type ValidatedThrottleConfigType = {
    'adaptive'?: Required<AdaptiveConfigEntity.Type>;
    'concurrencyLimit': number;
  };

  const compiledValidate = SchemaValidator.compile<Type>(Schema);

  export function validate(candidate: unknown): candidate is Type {
    if (!compiledValidate(candidate)) {
      throw ConfigurationError.create(SchemaValidator.formatErrors(compiledValidate.errors));
    }
    return true;
  }
}
