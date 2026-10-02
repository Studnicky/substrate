import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface, SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

const expectedSchemas = {
  'acquiredCount': { 'type': 'number' },
  'acquiredKeys': { 'items': { 'type': 'string' }, 'type': 'array' },
  'acquireEvents': { 'oneOf': [{ 'type': 'number' }, { 'items': { 'type': 'string' }, 'type': 'array' }] },
  'acquireWaitCount': { 'type': 'number' },
  'afterReleaseEvents': { 'items': { 'type': 'string' }, 'type': 'array' },
  'afterReleaseEventsAfterDrop': { 'items': { 'type': 'string' }, 'type': 'array' },
  'afterReleaseEventsAfterHandoff': { 'items': { 'type': 'string' }, 'type': 'array' },
  'contentionEvents': { 'type': 'number' },
  'errorName': { 'type': 'string' },
  'holdTimeMsMinimum': { 'type': 'number' },
  'hookErrorCount': { 'type': 'number' },
  'hookName': { 'type': 'string' },
  'hookNames': { 'items': { 'type': 'string' }, 'type': 'array' },
  'lockedAfterRelease': { 'type': 'boolean' },
  'onReleaseCount': { 'type': 'number' },
  'onReleaseEventsAfterDrop': { 'items': { 'type': 'string' }, 'type': 'array' },
  'queueContinues': { 'type': 'boolean' },
  'queueDrainCount': { 'type': 'number' },
  'queueSize': { 'type': 'number' },
  'released': { 'type': 'boolean' },
  'releasedCount': { 'type': 'number' },
  'releaseEvents': { 'type': 'number' },
  'secondWaitTimeMsMinimum': { 'type': 'number' },
  'timeoutMs': { 'type': 'number' },
  'unhandledRejections': { 'type': 'number' },
  'waitTimeMs': { 'type': 'number' }
} as const;

const inputSchemas = {
  'batch': {
    'additionalProperties': false,
    'properties': { 'pendingCount': { 'type': 'number' } },
    'required': [],
    'type': 'object'
  },
  'holdMs': { 'oneOf': [{ 'type': 'number' }, { 'items': { 'type': 'number' }, 'type': 'array' }] },
  'key': { 'minLength': 1, 'type': 'string' },
  'keys': { 'items': { 'type': 'string' }, 'type': 'array' },
  'mutex': {
    'additionalProperties': false,
    'properties': { 'timeout': { 'type': 'number' } },
    'required': [],
    'type': 'object'
  },
  'waitMs': { 'type': 'number' }
} as const;

const expectedNodes = {
  'acquiredCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'acquiredKeys': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
  'acquireEvents': SchemaNode.defineOneOf({}, [SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined)]),
  'acquireWaitCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'afterReleaseEvents': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
  'afterReleaseEventsAfterDrop': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
  'afterReleaseEventsAfterHandoff': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
  'contentionEvents': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'errorName': SchemaNode.defineString({ 'type': 'string' } as const),
  'holdTimeMsMinimum': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'hookErrorCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'hookName': SchemaNode.defineString({ 'type': 'string' } as const),
  'hookNames': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
  'lockedAfterRelease': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
  'onReleaseCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'onReleaseEventsAfterDrop': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
  'queueContinues': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
  'queueDrainCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'queueSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'released': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
  'releasedCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'releaseEvents': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'secondWaitTimeMsMinimum': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'timeoutMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'unhandledRejections': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'waitTimeMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
} as const;

const inputNodes = {
  'batch': SchemaNode.defineObject({ 'type': 'object' } as const, { 'pendingCount': SchemaNode.defineNumber({ 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  'holdMs': SchemaNode.defineOneOf({}, [SchemaNode.defineNumber({ 'type': 'number' } as const), SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined)]),
  'key': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'keys': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'type': 'string' } as const), undefined),
  'mutex': SchemaNode.defineObject({ 'type': 'object' } as const, { 'timeout': SchemaNode.defineNumber({ 'type': 'number' } as const) }, [] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  'waitMs': SchemaNode.defineNumber({ 'type': 'number' } as const)
} as const;

/** Builds one branch per `shape`: the shared `{ description, expected, input, name, shape }` envelope around a shape-specific `input` and `expected`. */
class ObservabilityScenarioCaseEntityBranches {
  static scenarioSchema<
    const TShape extends string,
    TInputSchema extends Record<string, unknown>,
    TExpectedSchema extends Record<string, unknown>
  >(shape: TShape, inputSchema: TInputSchema, expectedSchema: TExpectedSchema) {
    const result = {
      'additionalProperties': false,
      'properties': {
        'description': { 'minLength': 1, 'type': 'string' },
        'expected': expectedSchema,
        'input': inputSchema,
        'name': { 'minLength': 1, 'type': 'string' },
        'shape': { 'const': shape }
      },
      'required': ['description', 'expected', 'input', 'name', 'shape'],
      'type': 'object'
    } as const;
    return result;
  }

  static scenarioNode<
    const TShape extends string,
    TInputNode extends SchemaNodeInterface<unknown, unknown>,
    TExpectedNode extends SchemaNodeInterface<unknown, unknown>
  >(shape: TShape, inputNode: TInputNode, expectedNode: TExpectedNode) {
    const result = SchemaNode.defineObject({ 'type': 'object' } as const, {
      'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'expected': expectedNode,
      'input': inputNode,
      'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
      'shape': SchemaNode.defineConst({}, shape)
    }, ['description', 'expected', 'input', 'name', 'shape'] as const, { 'additionalProperties': false, 'patternProperties': {} });
    return result;
  }
}

/**
 * The scenario case shapes `observability.loop.spec.ts` exercises across 25 hook-observation behaviors, one branch per `shape`.
 * Each branch declares exactly the `input` and `expected` fields its shape uses.
 */
export namespace ObservabilityScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('afterAcquire-immediate', { 'additionalProperties': false, 'properties': { 'key': inputSchemas.key }, 'required': ['key'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'acquireEvents': expectedSchemas.acquireEvents, 'waitTimeMs': expectedSchemas.waitTimeMs }, 'required': ['acquireEvents', 'waitTimeMs'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('afterAcquire-waiting', { 'additionalProperties': false, 'properties': { 'batch': inputSchemas.batch, 'key': inputSchemas.key, 'waitMs': inputSchemas.waitMs }, 'required': ['batch', 'key', 'waitMs'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'acquireEvents': expectedSchemas.acquireEvents, 'secondWaitTimeMsMinimum': expectedSchemas.secondWaitTimeMsMinimum }, 'required': ['acquireEvents', 'secondWaitTimeMsMinimum'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('afterAcquire-separate-keys', { 'additionalProperties': false, 'properties': { 'keys': inputSchemas.keys }, 'required': ['keys'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'acquireEvents': expectedSchemas.acquireEvents }, 'required': ['acquireEvents'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('beforeRelease-fires', { 'additionalProperties': false, 'properties': { 'holdMs': inputSchemas.holdMs, 'key': inputSchemas.key }, 'required': ['holdMs', 'key'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'holdTimeMsMinimum': expectedSchemas.holdTimeMsMinimum, 'releaseEvents': expectedSchemas.releaseEvents }, 'required': ['holdTimeMsMinimum', 'releaseEvents'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('beforeRelease-tracks-hold-time', { 'additionalProperties': false, 'properties': { 'holdMs': inputSchemas.holdMs, 'key': inputSchemas.key }, 'required': ['holdMs', 'key'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'holdTimeMsMinimum': expectedSchemas.holdTimeMsMinimum, 'releaseEvents': expectedSchemas.releaseEvents }, 'required': ['holdTimeMsMinimum', 'releaseEvents'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('onTimeout-fires', { 'additionalProperties': false, 'properties': { 'batch': inputSchemas.batch, 'key': inputSchemas.key, 'mutex': inputSchemas.mutex }, 'required': ['batch', 'key', 'mutex'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'hookName': expectedSchemas.hookName, 'timeoutMs': expectedSchemas.timeoutMs }, 'required': ['hookName', 'timeoutMs'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('onContended-fires', { 'additionalProperties': false, 'properties': { 'batch': inputSchemas.batch, 'key': inputSchemas.key }, 'required': ['batch', 'key'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'contentionEvents': expectedSchemas.contentionEvents, 'queueSize': expectedSchemas.queueSize }, 'required': ['contentionEvents', 'queueSize'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('afterRelease-fires', { 'additionalProperties': false, 'properties': { 'key': inputSchemas.key }, 'required': ['key'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'afterReleaseEvents': expectedSchemas.afterReleaseEvents }, 'required': ['afterReleaseEvents'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('afterRelease-fires-on-handoff-and-drop', { 'additionalProperties': false, 'properties': { 'key': inputSchemas.key }, 'required': ['key'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'afterReleaseEventsAfterDrop': expectedSchemas.afterReleaseEventsAfterDrop, 'afterReleaseEventsAfterHandoff': expectedSchemas.afterReleaseEventsAfterHandoff, 'onReleaseEventsAfterDrop': expectedSchemas.onReleaseEventsAfterDrop }, 'required': ['afterReleaseEventsAfterDrop', 'afterReleaseEventsAfterHandoff', 'onReleaseEventsAfterDrop'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('hook-errors-do-not-break-locking', { 'additionalProperties': false, 'properties': { 'key': inputSchemas.key }, 'required': ['key'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'lockedAfterRelease': expectedSchemas.lockedAfterRelease, 'released': expectedSchemas.released }, 'required': ['lockedAfterRelease', 'released'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('beforeAcquire-error-is-recorded', { 'additionalProperties': false, 'properties': { 'key': inputSchemas.key }, 'required': ['key'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'hookErrorCount': expectedSchemas.hookErrorCount, 'hookName': expectedSchemas.hookName }, 'required': ['hookErrorCount', 'hookName'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('afterAcquire-error-does-not-stop-queue', { 'additionalProperties': false, 'properties': { 'batch': inputSchemas.batch, 'key': inputSchemas.key }, 'required': ['batch', 'key'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'acquiredKeys': expectedSchemas.acquiredKeys, 'queueContinues': expectedSchemas.queueContinues }, 'required': ['acquiredKeys', 'queueContinues'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('async-hook-rejections-are-recorded', { 'additionalProperties': false, 'properties': { 'batch': inputSchemas.batch, 'keys': inputSchemas.keys, 'mutex': inputSchemas.mutex }, 'required': ['batch', 'keys', 'mutex'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'hookNames': expectedSchemas.hookNames, 'unhandledRejections': expectedSchemas.unhandledRejections }, 'required': ['hookNames', 'unhandledRejections'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('tracks-all-metrics', { 'additionalProperties': false, 'properties': { 'holdMs': inputSchemas.holdMs, 'keys': inputSchemas.keys }, 'required': ['holdMs', 'keys'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'acquiredCount': expectedSchemas.acquiredCount, 'releasedCount': expectedSchemas.releasedCount }, 'required': ['acquiredCount', 'releasedCount'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('onAcquireWait-not-immediate', { 'additionalProperties': false, 'properties': { 'key': inputSchemas.key }, 'required': ['key'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'acquireWaitCount': expectedSchemas.acquireWaitCount }, 'required': ['acquireWaitCount'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('onAcquireWait-queued', { 'additionalProperties': false, 'properties': { 'batch': inputSchemas.batch, 'key': inputSchemas.key }, 'required': ['batch', 'key'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'acquireWaitCount': expectedSchemas.acquireWaitCount }, 'required': ['acquireWaitCount'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('onAcquireWait-per-waiter', { 'additionalProperties': false, 'properties': { 'batch': inputSchemas.batch, 'key': inputSchemas.key }, 'required': ['batch', 'key'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'acquireWaitCount': expectedSchemas.acquireWaitCount }, 'required': ['acquireWaitCount'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('onRelease-every-release', { 'additionalProperties': false, 'properties': { 'key': inputSchemas.key }, 'required': ['key'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'onReleaseCount': expectedSchemas.onReleaseCount }, 'required': ['onReleaseCount'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('onRelease-handoff', { 'additionalProperties': false, 'properties': { 'batch': inputSchemas.batch, 'key': inputSchemas.key }, 'required': ['batch', 'key'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'onReleaseCount': expectedSchemas.onReleaseCount }, 'required': ['onReleaseCount'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('onQueueDrain-normal', { 'additionalProperties': false, 'properties': { 'batch': inputSchemas.batch, 'key': inputSchemas.key }, 'required': ['batch', 'key'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'queueDrainCount': expectedSchemas.queueDrainCount }, 'required': ['queueDrainCount'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('onQueueDrain-timeout', { 'additionalProperties': false, 'properties': { 'batch': inputSchemas.batch, 'key': inputSchemas.key, 'mutex': inputSchemas.mutex }, 'required': ['batch', 'key', 'mutex'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'queueDrainCount': expectedSchemas.queueDrainCount }, 'required': ['queueDrainCount'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('onQueueDrain-not-early', { 'additionalProperties': false, 'properties': { 'batch': inputSchemas.batch, 'key': inputSchemas.key }, 'required': ['batch', 'key'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'queueDrainCount': expectedSchemas.queueDrainCount }, 'required': ['queueDrainCount'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('onRelease-throw-does-not-replace-release', { 'additionalProperties': false, 'properties': { 'key': inputSchemas.key }, 'required': ['key'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'lockedAfterRelease': expectedSchemas.lockedAfterRelease }, 'required': ['lockedAfterRelease'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('onQueueDrain-throw-does-not-replace-handoff', { 'additionalProperties': false, 'properties': { 'batch': inputSchemas.batch, 'key': inputSchemas.key }, 'required': ['batch', 'key'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'lockedAfterRelease': expectedSchemas.lockedAfterRelease }, 'required': ['lockedAfterRelease'], 'type': 'object' } as const),
      ObservabilityScenarioCaseEntityBranches.scenarioSchema('onTimeout-throw-does-not-replace-error', { 'additionalProperties': false, 'properties': { 'batch': inputSchemas.batch, 'key': inputSchemas.key, 'mutex': inputSchemas.mutex }, 'required': ['batch', 'key', 'mutex'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'errorName': expectedSchemas.errorName }, 'required': ['errorName'], 'type': 'object' } as const)
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    ObservabilityScenarioCaseEntityBranches.scenarioNode('afterAcquire-immediate', SchemaNode.defineObject({ 'type': 'object' } as const, { 'key': inputNodes.key }, ['key'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'acquireEvents': expectedNodes.acquireEvents, 'waitTimeMs': expectedNodes.waitTimeMs }, ['acquireEvents', 'waitTimeMs'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('afterAcquire-waiting', SchemaNode.defineObject({ 'type': 'object' } as const, { 'batch': inputNodes.batch, 'key': inputNodes.key, 'waitMs': inputNodes.waitMs }, ['batch', 'key', 'waitMs'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'acquireEvents': expectedNodes.acquireEvents, 'secondWaitTimeMsMinimum': expectedNodes.secondWaitTimeMsMinimum }, ['acquireEvents', 'secondWaitTimeMsMinimum'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('afterAcquire-separate-keys', SchemaNode.defineObject({ 'type': 'object' } as const, { 'keys': inputNodes.keys }, ['keys'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'acquireEvents': expectedNodes.acquireEvents }, ['acquireEvents'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('beforeRelease-fires', SchemaNode.defineObject({ 'type': 'object' } as const, { 'holdMs': inputNodes.holdMs, 'key': inputNodes.key }, ['holdMs', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'holdTimeMsMinimum': expectedNodes.holdTimeMsMinimum, 'releaseEvents': expectedNodes.releaseEvents }, ['holdTimeMsMinimum', 'releaseEvents'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('beforeRelease-tracks-hold-time', SchemaNode.defineObject({ 'type': 'object' } as const, { 'holdMs': inputNodes.holdMs, 'key': inputNodes.key }, ['holdMs', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'holdTimeMsMinimum': expectedNodes.holdTimeMsMinimum, 'releaseEvents': expectedNodes.releaseEvents }, ['holdTimeMsMinimum', 'releaseEvents'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('onTimeout-fires', SchemaNode.defineObject({ 'type': 'object' } as const, { 'batch': inputNodes.batch, 'key': inputNodes.key, 'mutex': inputNodes.mutex }, ['batch', 'key', 'mutex'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'hookName': expectedNodes.hookName, 'timeoutMs': expectedNodes.timeoutMs }, ['hookName', 'timeoutMs'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('onContended-fires', SchemaNode.defineObject({ 'type': 'object' } as const, { 'batch': inputNodes.batch, 'key': inputNodes.key }, ['batch', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'contentionEvents': expectedNodes.contentionEvents, 'queueSize': expectedNodes.queueSize }, ['contentionEvents', 'queueSize'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('afterRelease-fires', SchemaNode.defineObject({ 'type': 'object' } as const, { 'key': inputNodes.key }, ['key'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'afterReleaseEvents': expectedNodes.afterReleaseEvents }, ['afterReleaseEvents'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('afterRelease-fires-on-handoff-and-drop', SchemaNode.defineObject({ 'type': 'object' } as const, { 'key': inputNodes.key }, ['key'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'afterReleaseEventsAfterDrop': expectedNodes.afterReleaseEventsAfterDrop, 'afterReleaseEventsAfterHandoff': expectedNodes.afterReleaseEventsAfterHandoff, 'onReleaseEventsAfterDrop': expectedNodes.onReleaseEventsAfterDrop }, ['afterReleaseEventsAfterDrop', 'afterReleaseEventsAfterHandoff', 'onReleaseEventsAfterDrop'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('hook-errors-do-not-break-locking', SchemaNode.defineObject({ 'type': 'object' } as const, { 'key': inputNodes.key }, ['key'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'lockedAfterRelease': expectedNodes.lockedAfterRelease, 'released': expectedNodes.released }, ['lockedAfterRelease', 'released'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('beforeAcquire-error-is-recorded', SchemaNode.defineObject({ 'type': 'object' } as const, { 'key': inputNodes.key }, ['key'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'hookErrorCount': expectedNodes.hookErrorCount, 'hookName': expectedNodes.hookName }, ['hookErrorCount', 'hookName'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('afterAcquire-error-does-not-stop-queue', SchemaNode.defineObject({ 'type': 'object' } as const, { 'batch': inputNodes.batch, 'key': inputNodes.key }, ['batch', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'acquiredKeys': expectedNodes.acquiredKeys, 'queueContinues': expectedNodes.queueContinues }, ['acquiredKeys', 'queueContinues'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('async-hook-rejections-are-recorded', SchemaNode.defineObject({ 'type': 'object' } as const, { 'batch': inputNodes.batch, 'keys': inputNodes.keys, 'mutex': inputNodes.mutex }, ['batch', 'keys', 'mutex'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'hookNames': expectedNodes.hookNames, 'unhandledRejections': expectedNodes.unhandledRejections }, ['hookNames', 'unhandledRejections'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('tracks-all-metrics', SchemaNode.defineObject({ 'type': 'object' } as const, { 'holdMs': inputNodes.holdMs, 'keys': inputNodes.keys }, ['holdMs', 'keys'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'acquiredCount': expectedNodes.acquiredCount, 'releasedCount': expectedNodes.releasedCount }, ['acquiredCount', 'releasedCount'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('onAcquireWait-not-immediate', SchemaNode.defineObject({ 'type': 'object' } as const, { 'key': inputNodes.key }, ['key'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'acquireWaitCount': expectedNodes.acquireWaitCount }, ['acquireWaitCount'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('onAcquireWait-queued', SchemaNode.defineObject({ 'type': 'object' } as const, { 'batch': inputNodes.batch, 'key': inputNodes.key }, ['batch', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'acquireWaitCount': expectedNodes.acquireWaitCount }, ['acquireWaitCount'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('onAcquireWait-per-waiter', SchemaNode.defineObject({ 'type': 'object' } as const, { 'batch': inputNodes.batch, 'key': inputNodes.key }, ['batch', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'acquireWaitCount': expectedNodes.acquireWaitCount }, ['acquireWaitCount'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('onRelease-every-release', SchemaNode.defineObject({ 'type': 'object' } as const, { 'key': inputNodes.key }, ['key'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'onReleaseCount': expectedNodes.onReleaseCount }, ['onReleaseCount'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('onRelease-handoff', SchemaNode.defineObject({ 'type': 'object' } as const, { 'batch': inputNodes.batch, 'key': inputNodes.key }, ['batch', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'onReleaseCount': expectedNodes.onReleaseCount }, ['onReleaseCount'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('onQueueDrain-normal', SchemaNode.defineObject({ 'type': 'object' } as const, { 'batch': inputNodes.batch, 'key': inputNodes.key }, ['batch', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'queueDrainCount': expectedNodes.queueDrainCount }, ['queueDrainCount'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('onQueueDrain-timeout', SchemaNode.defineObject({ 'type': 'object' } as const, { 'batch': inputNodes.batch, 'key': inputNodes.key, 'mutex': inputNodes.mutex }, ['batch', 'key', 'mutex'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'queueDrainCount': expectedNodes.queueDrainCount }, ['queueDrainCount'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('onQueueDrain-not-early', SchemaNode.defineObject({ 'type': 'object' } as const, { 'batch': inputNodes.batch, 'key': inputNodes.key }, ['batch', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'queueDrainCount': expectedNodes.queueDrainCount }, ['queueDrainCount'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('onRelease-throw-does-not-replace-release', SchemaNode.defineObject({ 'type': 'object' } as const, { 'key': inputNodes.key }, ['key'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'lockedAfterRelease': expectedNodes.lockedAfterRelease }, ['lockedAfterRelease'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('onQueueDrain-throw-does-not-replace-handoff', SchemaNode.defineObject({ 'type': 'object' } as const, { 'batch': inputNodes.batch, 'key': inputNodes.key }, ['batch', 'key'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'lockedAfterRelease': expectedNodes.lockedAfterRelease }, ['lockedAfterRelease'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    ObservabilityScenarioCaseEntityBranches.scenarioNode('onTimeout-throw-does-not-replace-error', SchemaNode.defineObject({ 'type': 'object' } as const, { 'batch': inputNodes.batch, 'key': inputNodes.key, 'mutex': inputNodes.mutex }, ['batch', 'key', 'mutex'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'errorName': expectedNodes.errorName }, ['errorName'] as const, { 'additionalProperties': false, 'patternProperties': {} }))
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
