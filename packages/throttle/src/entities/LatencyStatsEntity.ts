import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

export namespace LatencyStatsEntity {
  export const Schema = {
    '$id': 'https://studnicky.github.io/substrate/schemas/LatencyStats',
    '$schema': 'https://json-schema.org/draft/2020-12/schema',
    'additionalProperties': false,
    'description': 'Latency statistics from the sliding window buffer.',
    'properties': {
      'p50': {
        'description': '50th percentile (median) latency in milliseconds. Absent when the buffer has no samples yet.',
        'minimum': 0,
        'type': 'number'
      },
      'p95': {
        'description': '95th percentile latency in milliseconds. Absent when the buffer has no samples yet.',
        'minimum': 0,
        'type': 'number'
      },
      'p99': {
        'description': '99th percentile latency in milliseconds. Absent when the buffer has no samples yet.',
        'minimum': 0,
        'type': 'number'
      },
      'sampleCount': {
        'description': 'Number of samples in the buffer.',
        'minimum': 0,
        'type': 'integer'
      }
    },
    'required': ['sampleCount'],
    'title': 'LatencyStats',
    'type': 'object'
  } as const;

  export const Node = SchemaNode.defineObject({ '$id': 'https://studnicky.github.io/substrate/schemas/LatencyStats', '$schema': 'https://json-schema.org/draft/2020-12/schema', 'description': 'Latency statistics from the sliding window buffer.', 'title': 'LatencyStats', 'type': 'object' } as const, { 'p50': SchemaNode.defineNumber({
    'description': '50th percentile (median) latency in milliseconds. Absent when the buffer has no samples yet.',
    'minimum': 0,
    'type': 'number'
  } as const), 'p95': SchemaNode.defineNumber({
    'description': '95th percentile latency in milliseconds. Absent when the buffer has no samples yet.',
    'minimum': 0,
    'type': 'number'
  } as const), 'p99': SchemaNode.defineNumber({
    'description': '99th percentile latency in milliseconds. Absent when the buffer has no samples yet.',
    'minimum': 0,
    'type': 'number'
  } as const), 'sampleCount': SchemaNode.defineNumber({
    'description': 'Number of samples in the buffer.',
    'minimum': 0,
    'type': 'integer'
  } as const) }, ['sampleCount'] as const, { 'additionalProperties': false });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
