import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

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
  } as const;

  export const Node = SchemaNode.defineObject({ 'type': 'object' } as const, { 'adjustmentInterval': SchemaNode.defineNumber({
    'description': 'Minimum milliseconds between adjustments.',
    'minimum': 100,
    'type': 'integer'
  } as const), 'enabled': SchemaNode.defineBoolean({
    'description': 'Whether adaptive concurrency is enabled.',
    'type': 'boolean'
  } as const), 'maximumConcurrency': SchemaNode.defineNumber({
    'description': 'Maximum concurrency limit (ceiling).',
    'minimum': 1,
    'type': 'integer'
  } as const), 'minimumConcurrency': SchemaNode.defineNumber({
    'description': 'Minimum concurrency limit (floor).',
    'minimum': 1,
    'type': 'integer'
  } as const), 'sampleWindow': SchemaNode.defineNumber({
    'description': 'Number of samples in sliding window.',
    'minimum': 10,
    'type': 'integer'
  } as const), 'scaleDownThreshold': SchemaNode.defineNumber({
    'description': 'Scale down when p95 latency exceeds targetLatencyMs * scaleDownThreshold.',
    'exclusiveMinimum': 0,
    'type': 'number'
  } as const), 'scaleUpThreshold': SchemaNode.defineNumber({
    'description': 'Scale up when p95 latency is below targetLatencyMs * scaleUpThreshold.',
    'exclusiveMinimum': 0,
    'type': 'number'
  } as const), 'stepSize': SchemaNode.defineNumber({
    'description': 'Concurrency change per adjustment.',
    'minimum': 1,
    'type': 'integer'
  } as const), 'targetLatencyMs': SchemaNode.defineNumber({
    'description': 'Target latency in milliseconds for p95.',
    'exclusiveMinimum': 0,
    'type': 'number'
  } as const) }, ['enabled'] as const, { 'additionalProperties': false, 'patternProperties': {} });
  export type Type = NodeStaticType<typeof Node>;
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
