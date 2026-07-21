import type { ValidateFunction } from 'ajv';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { SchemaValidator } from '@studnicky/json';

export namespace AdaptiveStatsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/AdaptiveStats',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Adaptive concurrency statistics.',
    'properties': {
      'adjustmentCount': {
        'description': 'Total number of adjustments made.',
        'minimum': 0,
        'type': 'integer'
      },
      'enabled': {
        'description': 'Whether adaptive mode is enabled.',
        'type': 'boolean'
      },
      'lastAdjustmentTime': {
        'description': 'Timestamp of last adjustment (ms since epoch).',
        'minimum': 0,
        'type': 'integer'
      },
      'maxConcurrency': {
        'description': 'Maximum concurrency limit.',
        'minimum': 1,
        'type': 'integer'
      },
      'minConcurrency': {
        'description': 'Minimum concurrency limit.',
        'minimum': 1,
        'type': 'integer'
      },
      'targetLatencyMs': {
        'description': 'Target latency in milliseconds.',
        'exclusiveMinimum': 0,
        'type': 'number'
      }
    },
    'required': [
      'adjustmentCount',
      'enabled',
      'lastAdjustmentTime',
      'maxConcurrency',
      'minConcurrency',
      'targetLatencyMs'
    ],
    'title': 'AdaptiveStats',
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: ValidateFunction<Type> = SchemaValidator.compile<Type>(Schema);
}
