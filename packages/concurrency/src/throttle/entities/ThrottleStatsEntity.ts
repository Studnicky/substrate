import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { SchemaNode } from '@studnicky/entity/types';

import { EntityCompiler } from '#runtime';

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
        'additionalProperties': false,
        'description': 'Adaptive concurrency statistics. Present when adaptive concurrency is enabled.',
        'properties': {
          'adjustmentCount': { 'minimum': 0, 'type': 'integer' },
          'enabled': { 'type': 'boolean' },
          'lastAdjustmentTime': { 'minimum': 0, 'type': 'integer' },
          'maximumConcurrency': { 'minimum': 1, 'type': 'integer' },
          'minimumConcurrency': { 'minimum': 1, 'type': 'integer' },
          'targetLatencyMs': { 'exclusiveMinimum': 0, 'type': 'number' }
        },
        'required': [
          'adjustmentCount',
          'enabled',
          'lastAdjustmentTime',
          'maximumConcurrency',
          'minimumConcurrency',
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
        'additionalProperties': false,
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
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/ThrottleStats', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Runtime statistics for a Throttle instance.', 'title': 'ThrottleStats', 'type': 'object' } as const, { 'activeCount': SchemaNode.defineNumber({
    'description': 'Number of operations currently executing.',
    'minimum': 0,
    'type': 'integer'
  } as const), 'adaptive': SchemaNode.defineObject({ 'description': 'Adaptive concurrency statistics. Present when adaptive concurrency is enabled.', 'type': 'object' } as const, { 'adjustmentCount': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'enabled': SchemaNode.defineBoolean({ 'type': 'boolean' } as const), 'lastAdjustmentTime': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const), 'maximumConcurrency': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'minimumConcurrency': SchemaNode.defineNumber({ 'minimum': 1, 'type': 'integer' } as const), 'targetLatencyMs': SchemaNode.defineNumber({ 'exclusiveMinimum': 0, 'type': 'number' } as const) }, [
    'adjustmentCount',
    'enabled',
    'lastAdjustmentTime',
    'maximumConcurrency',
    'minimumConcurrency',
    'targetLatencyMs'
  ] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'concurrencyLimit': SchemaNode.defineNumber({
    'description': 'Concurrency limit.',
    'minimum': 1,
    'type': 'integer'
  } as const), 'isAborted': SchemaNode.defineBoolean({
    'description': 'Whether the throttle has been aborted (all operations cancelled).',
    'type': 'boolean'
  } as const), 'isDraining': SchemaNode.defineBoolean({
    'description': 'Whether the throttle is in draining mode (rejecting new operations).',
    'type': 'boolean'
  } as const), 'latency': SchemaNode.defineObject({ 'description': 'Latency statistics from the sliding window buffer. Present when adaptive concurrency is enabled.', 'type': 'object' } as const, { 'p50': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'p95': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'p99': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'number' } as const), 'sampleCount': SchemaNode.defineNumber({ 'minimum': 0, 'type': 'integer' } as const) }, ['sampleCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }), 'queuedCount': SchemaNode.defineNumber({
    'description': 'Number of operations waiting in queue.',
    'minimum': 0,
    'type': 'integer'
  } as const), 'totalExecuted': SchemaNode.defineNumber({
    'description': 'Total number of operations executed.',
    'minimum': 0,
    'type': 'integer'
  } as const) }, [
    'activeCount',
    'concurrencyLimit',
    'isAborted',
    'isDraining',
    'queuedCount',
    'totalExecuted'
  ] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
