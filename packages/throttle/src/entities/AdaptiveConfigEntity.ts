import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { FromSchema, JSONSchema } from 'json-schema-to-ts';

import { EntityCompiler } from '@studnicky/entity/node';

export namespace AdaptiveConfigEntity {
  export const Schema = {
    'additionalProperties': false,
    'properties': {
      'adjustmentInterval': {
        'description': 'Minimum milliseconds between adjustments.',
        'minimum': 100,
        'type': 'integer'
      },
      'enabled': {
        'description': 'Whether adaptive concurrency is enabled.',
        'type': 'boolean'
      },
      'maximumConcurrency': {
        'description': 'Maximum concurrency limit (ceiling).',
        'minimum': 1,
        'type': 'integer'
      },
      'minimumConcurrency': {
        'description': 'Minimum concurrency limit (floor).',
        'minimum': 1,
        'type': 'integer'
      },
      'sampleWindow': {
        'description': 'Number of samples in sliding window.',
        'minimum': 10,
        'type': 'integer'
      },
      'scaleDownThreshold': {
        'description': 'Scale down when p95 latency exceeds targetLatencyMs * scaleDownThreshold.',
        'exclusiveMinimum': 0,
        'type': 'number'
      },
      'scaleUpThreshold': {
        'description': 'Scale up when p95 latency is below targetLatencyMs * scaleUpThreshold.',
        'exclusiveMinimum': 0,
        'type': 'number'
      },
      'stepSize': {
        'description': 'Concurrency change per adjustment.',
        'minimum': 1,
        'type': 'integer'
      },
      'targetLatencyMs': {
        'description': 'Target latency in milliseconds for p95.',
        'exclusiveMinimum': 0,
        'type': 'number'
      }
    },
    'required': ['enabled'],
    'type': 'object'
  } as const satisfies JSONSchema;

  export type Type = FromSchema<typeof Schema>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
