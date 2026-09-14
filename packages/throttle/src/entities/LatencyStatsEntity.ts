import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

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
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
