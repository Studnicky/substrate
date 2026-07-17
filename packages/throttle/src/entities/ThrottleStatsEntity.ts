import { SchemaValidator } from '@studnicky/json';
import { type FromSchema, type JsonSchemaObjectType } from '@studnicky/types';

export namespace ThrottleStatsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/ThrottleStats',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Runtime statistics for a Throttle instance.',
    'properties': {
      'activeCount': {
        'description': 'Number of operations currently executing.',
        'minimum': 0,
        'type': 'integer'
      },
      'adaptive': {
        'description': 'Adaptive concurrency statistics. Present when adaptive concurrency is enabled.',
        'properties': {
          'adjustmentCount': { 'minimum': 0, 'type': 'integer' },
          'enabled': { 'type': 'boolean' },
          'lastAdjustmentTime': { 'minimum': 0, 'type': 'integer' },
          'maxConcurrency': { 'minimum': 1, 'type': 'integer' },
          'minConcurrency': { 'minimum': 1, 'type': 'integer' },
          'targetLatencyMs': { 'exclusiveMinimum': 0, 'type': 'number' }
        },
        'required': [
          'adjustmentCount',
          'enabled',
          'lastAdjustmentTime',
          'maxConcurrency',
          'minConcurrency',
          'targetLatencyMs'
        ],
        'type': 'object'
      },
      'concurrencyLimit': {
        'description': 'Concurrency limit.',
        'minimum': 1,
        'type': 'integer'
      },
      'isAborted': {
        'description': 'Whether the throttle has been aborted (all operations cancelled).',
        'type': 'boolean'
      },
      'isDraining': {
        'description': 'Whether the throttle is in draining mode (rejecting new operations).',
        'type': 'boolean'
      },
      'latency': {
        'description': 'Latency statistics from the sliding window buffer. Present when adaptive concurrency is enabled.',
        'properties': {
          'p50': { 'minimum': 0, 'type': 'number' },
          'p95': { 'minimum': 0, 'type': 'number' },
          'p99': { 'minimum': 0, 'type': 'number' },
          'sampleCount': { 'minimum': 0, 'type': 'integer' }
        },
        'required': ['sampleCount'],
        'type': 'object'
      },
      'queuedCount': {
        'description': 'Number of operations waiting in queue.',
        'minimum': 0,
        'type': 'integer'
      },
      'totalExecuted': {
        'description': 'Total number of operations executed.',
        'minimum': 0,
        'type': 'integer'
      }
    },
    'required': [
      'activeCount',
      'concurrencyLimit',
      'isAborted',
      'isDraining',
      'queuedCount',
      'totalExecuted'
    ],
    'title': 'ThrottleStats',
    'type': 'object'
  } as const satisfies JsonSchemaObjectType;

  export type Type = FromSchema<typeof Schema>;

  export const validate = SchemaValidator.compile<Type>(Schema);
}
