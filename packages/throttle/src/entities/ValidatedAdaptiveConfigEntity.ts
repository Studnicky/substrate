import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface } from '@studnicky/entity/interfaces';
import type { NodeInputType, NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

/** Fields every branch carries, restated per branch (not extracted to a shared entity) so each branch is a complete, self-contained `defineObject` — `defineAnyOf`'s static type is `InferUnionOfStaticType<TItems>` alone, with no mechanism to intersect a sibling schema into it. */
const sharedFieldSchema = {
  'adjustmentInterval': {
    'description': 'Minimum milliseconds between adjustments.',
    'minimum': 100,
    'type': 'integer'
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
  }
} as const;

const SHARED_REQUIRED = ['adjustmentInterval', 'maximumConcurrency', 'minimumConcurrency', 'sampleWindow', 'scaleDownThreshold', 'scaleUpThreshold', 'stepSize'] as const;

const disabledBranchSchema = {
  'additionalProperties': false,
  'properties': {
    ...sharedFieldSchema,
    'enabled': { 'const': false },
    'targetLatencyMs': {
      'description': 'Target latency in milliseconds for p95, or zero when adaptive concurrency is disabled.',
      'minimum': 0,
      'type': 'number'
    }
  },
  'required': [...SHARED_REQUIRED, 'enabled', 'targetLatencyMs'],
  'type': 'object'
} as const;

const enabledBranchSchema = {
  'additionalProperties': false,
  'properties': {
    ...sharedFieldSchema,
    'enabled': { 'const': true },
    'targetLatencyMs': {
      'description': 'Target latency in milliseconds for p95.',
      'exclusiveMinimum': 0,
      'type': 'number'
    }
  },
  'required': [...SHARED_REQUIRED, 'enabled', 'targetLatencyMs'],
  'type': 'object'
} as const;

class SharedFieldNodeBuilder {
  static build() {
    return {
      'adjustmentInterval': SchemaNode.defineNumber(sharedFieldSchema.adjustmentInterval),
      'maximumConcurrency': SchemaNode.defineNumber(sharedFieldSchema.maximumConcurrency),
      'minimumConcurrency': SchemaNode.defineNumber(sharedFieldSchema.minimumConcurrency),
      'sampleWindow': SchemaNode.defineNumber(sharedFieldSchema.sampleWindow),
      'scaleDownThreshold': SchemaNode.defineNumber(sharedFieldSchema.scaleDownThreshold),
      'scaleUpThreshold': SchemaNode.defineNumber(sharedFieldSchema.scaleUpThreshold),
      'stepSize': SchemaNode.defineNumber(sharedFieldSchema.stepSize)
    };
  }
}

const disabledBranch = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    ...SharedFieldNodeBuilder.build(),
    'enabled': SchemaNode.defineConst(false as const),
    'targetLatencyMs': SchemaNode.defineNumber(disabledBranchSchema.properties.targetLatencyMs)
  },
  [...SHARED_REQUIRED, 'enabled', 'targetLatencyMs'] as const,
  { 'additionalProperties': false }
);

const enabledBranch = SchemaNode.defineObject(
  { 'type': 'object' } as const,
  {
    ...SharedFieldNodeBuilder.build(),
    'enabled': SchemaNode.defineConst(true as const),
    'targetLatencyMs': SchemaNode.defineNumber(enabledBranchSchema.properties.targetLatencyMs)
  },
  [...SHARED_REQUIRED, 'enabled', 'targetLatencyMs'] as const,
  { 'additionalProperties': false }
);

/** Fully defaulted adaptive configuration retained by a throttle instance. Each `anyOf` branch restates every field as a complete `defineObject` — the only way `defineAnyOf`'s derived static type reflects the `enabled`-discriminated refinement, since the sibling-schema overload can't intersect a base shape into a union. */
export namespace ValidatedAdaptiveConfigEntity {
  export const Schema = {
    'anyOf': [disabledBranchSchema, enabledBranchSchema]
  } as const;

  export const Node = SchemaNode.defineAnyOf([disabledBranch, enabledBranch] as const);
  export type Type = NodeStaticType<typeof Node>;
  /** Not-yet-validated construction data — the shape a caller assembling a branch by hand supplies to {@link create}. */
  export type InputType = NodeInputType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type, InputType> = EntityCompiler.compileCreate<Type, InputType>(Schema);
}
