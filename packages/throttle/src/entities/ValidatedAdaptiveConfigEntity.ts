import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { ConfigurationError } from '@studnicky/config';
import { SchemaValidator } from '@studnicky/json';

import { AdaptiveConfigEntity } from './AdaptiveConfigEntity.js';

/** Fully defaulted adaptive configuration retained by a throttle instance. */
export namespace ValidatedAdaptiveConfigEntity {
  export const Schema = {
    ...AdaptiveConfigEntity.Schema,
    'anyOf': [
      {
        'properties': {
          'enabled': { 'const': false }
        }
      },
      {
        'properties': {
          'enabled': { 'const': true },
          'targetLatencyMs': {
            'exclusiveMinimum': 0,
            'type': 'number'
          }
        }
      }
    ],
    'properties': {
      ...AdaptiveConfigEntity.Schema.properties,
      'targetLatencyMs': {
        'description': 'Target latency in milliseconds for p95, or zero when adaptive concurrency is disabled.',
        'minimum': 0,
        'type': 'number'
      }
    },
    'required': [
      'adjustmentInterval',
      'enabled',
      'maxConcurrency',
      'minConcurrency',
      'sampleWindow',
      'scaleDownThreshold',
      'scaleUpThreshold',
      'stepSize',
      'targetLatencyMs'
    ]
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  const compiledValidate = SchemaValidator.compile<Type>(Schema);

  export function validate(candidate: unknown): candidate is Type {
    if (!compiledValidate(candidate)) {
      throw ConfigurationError.create(SchemaValidator.formatErrors(compiledValidate.errors));
    }
    return true;
  }
}
