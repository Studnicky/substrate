import type { EntityCreateFunctionInterface, EntityIntakeFunctionInterface, EntityValidateFunctionInterface, SchemaNodeInterface } from '@studnicky/entity/interfaces';
import type { NodeStaticType } from '@studnicky/entity/types';

import { EntityCompiler } from '@studnicky/entity/browser';
import { SchemaNode } from '@studnicky/entity/types';

import { ThrottleConfigEntity } from '../../../../src/throttle/entities/ThrottleConfigEntity.js';

const abortResultSchema = {
  'additionalProperties': false,
  'properties': { 'cancelled': { 'type': 'number' }, 'completed': { 'type': 'number' }, 'timedOut': { 'type': 'boolean' } },
  'required': [],
  'type': 'object'
} as const;

const abortResultNode = SchemaNode.defineObject({ 'type': 'object' } as const, {
  'cancelled': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'completed': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'timedOut': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
}, [] as const, { 'additionalProperties': false, 'patternProperties': {} });

const numberOrStringSchema = { 'oneOf': [{ 'type': 'number' }, { 'minLength': 1, 'type': 'string' }] } as const;
const numberOrStringNode = SchemaNode.defineOneOf({}, [
  SchemaNode.defineNumber({ 'type': 'number' } as const),
  SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const)
] as const);

const expectedSchemas = {
  'abort': abortResultSchema,
  'activeCount': { 'type': 'number' },
  'activeResolvedWithUndefined': { 'type': 'boolean' },
  'activeResult': { 'minLength': 1, 'type': 'string' },
  'causeMessage': { 'minLength': 1, 'type': 'string' },
  'drainResolvedBeforeRelease': { 'type': 'boolean' },
  'errorName': { 'minLength': 1, 'type': 'string' },
  'isComplete': { 'type': 'boolean' },
  'order': { 'items': { 'minLength': 1, 'type': 'string' }, 'type': 'array' },
  'queuedCount': { 'type': 'number' },
  'queuedResolvedWithUndefined': { 'type': 'boolean' },
  'queuedStarted': { 'type': 'boolean' },
  'releaseCount': { 'type': 'number' },
  'result': { 'minLength': 1, 'type': 'string' },
  'results': { 'items': { 'type': 'number' }, 'type': 'array' },
  'secondAbort': abortResultSchema,
  'totalExecuted': { 'type': 'number' }
} as const;

const inputSchemas = {
  'abortOptions': {
    'additionalProperties': false,
    'properties': { 'timeout': { 'type': 'number' } },
    'required': ['timeout'],
    'type': 'object'
  },
  'activeResult': numberOrStringSchema,
  'hookErrorMessage': { 'minLength': 1, 'type': 'string' },
  'operationErrorMessage': { 'minLength': 1, 'type': 'string' },
  'queuedResult': numberOrStringSchema,
  'settleMs': { 'type': 'number' },
  'throttle': ThrottleConfigEntity.Schema
} as const;

const expectedNodes = {
  'abort': abortResultNode,
  'activeCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'activeResolvedWithUndefined': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
  'activeResult': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'causeMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'drainResolvedBeforeRelease': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
  'errorName': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'isComplete': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
  'order': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const), undefined),
  'queuedCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'queuedResolvedWithUndefined': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
  'queuedStarted': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
  'releaseCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'result': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'results': SchemaNode.defineArray({ 'type': 'array' } as const, SchemaNode.defineNumber({ 'type': 'number' } as const), undefined),
  'secondAbort': abortResultNode,
  'totalExecuted': SchemaNode.defineNumber({ 'type': 'number' } as const)
} as const;

const inputNodes = {
  'abortOptions': SchemaNode.defineObject({ 'type': 'object' } as const, { 'timeout': SchemaNode.defineNumber({ 'type': 'number' } as const) }, ['timeout'] as const, { 'additionalProperties': false, 'patternProperties': {} }),
  'activeResult': numberOrStringNode,
  'hookErrorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'operationErrorMessage': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
  'queuedResult': numberOrStringNode,
  'settleMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
  'throttle': ThrottleConfigEntity.Node
} as const;

/** Builds one branch per `shape`: the shared `{ description, expected, input, name, shape }` envelope around a shape-specific `input` and `expected`. */
class LifecycleScenarioCaseEntityBranches {
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

/** `lifecycle.loop.spec.ts` exercises a single flat case shape across twenty-six scenario names. */
export namespace LifecycleScenarioCaseEntity {
  export const Schema = {
    'oneOf': [
      LifecycleScenarioCaseEntityBranches.scenarioSchema('abort-timeout-timed-out', { 'additionalProperties': false, 'properties': { 'abortOptions': inputSchemas.abortOptions, 'activeResult': inputSchemas.activeResult, 'throttle': inputSchemas.throttle }, 'required': ['abortOptions', 'activeResult', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'abort': expectedSchemas.abort }, 'required': ['abort'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('abort-timeout-completes', { 'additionalProperties': false, 'properties': { 'abortOptions': inputSchemas.abortOptions, 'activeResult': inputSchemas.activeResult, 'throttle': inputSchemas.throttle }, 'required': ['abortOptions', 'activeResult', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'abort': expectedSchemas.abort }, 'required': ['abort'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('abort-immediate-with-active-work', { 'additionalProperties': false, 'properties': { 'activeResult': inputSchemas.activeResult, 'throttle': inputSchemas.throttle }, 'required': ['activeResult', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'abort': expectedSchemas.abort }, 'required': ['abort'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('abort-zero-timeout-with-active-work', { 'additionalProperties': false, 'properties': { 'abortOptions': inputSchemas.abortOptions, 'activeResult': inputSchemas.activeResult, 'throttle': inputSchemas.throttle }, 'required': ['abortOptions', 'activeResult', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'abort': expectedSchemas.abort }, 'required': ['abort'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('abort-start-hook-throws', { 'additionalProperties': false, 'properties': { 'activeResult': inputSchemas.activeResult, 'hookErrorMessage': inputSchemas.hookErrorMessage, 'throttle': inputSchemas.throttle }, 'required': ['activeResult', 'hookErrorMessage', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': {  }, 'required': [], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('abort-after-abort-is-idempotent', { 'additionalProperties': false, 'properties': { 'throttle': inputSchemas.throttle }, 'required': ['throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'abort': expectedSchemas.abort, 'secondAbort': expectedSchemas.secondAbort }, 'required': ['abort', 'secondAbort'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('abort-on-complete-skips-grace-period', { 'additionalProperties': false, 'properties': { 'abortOptions': inputSchemas.abortOptions, 'throttle': inputSchemas.throttle }, 'required': ['abortOptions', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'abort': expectedSchemas.abort }, 'required': ['abort'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('abort-cancels-active-and-queued', { 'additionalProperties': false, 'properties': { 'activeResult': inputSchemas.activeResult, 'queuedResult': inputSchemas.queuedResult, 'settleMs': inputSchemas.settleMs, 'throttle': inputSchemas.throttle }, 'required': ['activeResult', 'queuedResult', 'settleMs', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'abort': expectedSchemas.abort, 'activeResolvedWithUndefined': expectedSchemas.activeResolvedWithUndefined, 'isComplete': expectedSchemas.isComplete, 'queuedResolvedWithUndefined': expectedSchemas.queuedResolvedWithUndefined, 'queuedStarted': expectedSchemas.queuedStarted, 'totalExecuted': expectedSchemas.totalExecuted }, 'required': ['abort', 'activeResolvedWithUndefined', 'isComplete', 'queuedResolvedWithUndefined', 'queuedStarted', 'totalExecuted'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('abort-during-draining-cancels-active-and-queued', { 'additionalProperties': false, 'properties': { 'abortOptions': inputSchemas.abortOptions, 'activeResult': inputSchemas.activeResult, 'queuedResult': inputSchemas.queuedResult, 'settleMs': inputSchemas.settleMs, 'throttle': inputSchemas.throttle }, 'required': ['abortOptions', 'activeResult', 'queuedResult', 'settleMs', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'abort': expectedSchemas.abort, 'activeResolvedWithUndefined': expectedSchemas.activeResolvedWithUndefined, 'isComplete': expectedSchemas.isComplete, 'queuedResolvedWithUndefined': expectedSchemas.queuedResolvedWithUndefined, 'queuedStarted': expectedSchemas.queuedStarted, 'totalExecuted': expectedSchemas.totalExecuted }, 'required': ['abort', 'activeResolvedWithUndefined', 'isComplete', 'queuedResolvedWithUndefined', 'queuedStarted', 'totalExecuted'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('on-acquire-throws', { 'additionalProperties': false, 'properties': { 'activeResult': inputSchemas.activeResult, 'hookErrorMessage': inputSchemas.hookErrorMessage, 'throttle': inputSchemas.throttle }, 'required': ['activeResult', 'hookErrorMessage', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'activeCount': expectedSchemas.activeCount, 'isComplete': expectedSchemas.isComplete }, 'required': ['activeCount', 'isComplete'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('on-release-throws', { 'additionalProperties': false, 'properties': { 'activeResult': inputSchemas.activeResult, 'hookErrorMessage': inputSchemas.hookErrorMessage, 'throttle': inputSchemas.throttle }, 'required': ['activeResult', 'hookErrorMessage', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'isComplete': expectedSchemas.isComplete }, 'required': ['isComplete'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('on-contended-throws', { 'additionalProperties': false, 'properties': { 'activeResult': inputSchemas.activeResult, 'hookErrorMessage': inputSchemas.hookErrorMessage, 'settleMs': inputSchemas.settleMs, 'throttle': inputSchemas.throttle }, 'required': ['activeResult', 'hookErrorMessage', 'settleMs', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'activeCount': expectedSchemas.activeCount, 'activeResult': expectedSchemas.activeResult, 'causeMessage': expectedSchemas.causeMessage, 'errorName': expectedSchemas.errorName, 'isComplete': expectedSchemas.isComplete, 'queuedCount': expectedSchemas.queuedCount }, 'required': ['activeCount', 'activeResult', 'causeMessage', 'errorName', 'isComplete', 'queuedCount'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('on-acquire-wait-throws', { 'additionalProperties': false, 'properties': { 'activeResult': inputSchemas.activeResult, 'hookErrorMessage': inputSchemas.hookErrorMessage, 'settleMs': inputSchemas.settleMs, 'throttle': inputSchemas.throttle }, 'required': ['activeResult', 'hookErrorMessage', 'settleMs', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'activeCount': expectedSchemas.activeCount, 'activeResult': expectedSchemas.activeResult, 'causeMessage': expectedSchemas.causeMessage, 'errorName': expectedSchemas.errorName, 'isComplete': expectedSchemas.isComplete, 'queuedCount': expectedSchemas.queuedCount }, 'required': ['activeCount', 'activeResult', 'causeMessage', 'errorName', 'isComplete', 'queuedCount'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('on-reject-throws', { 'additionalProperties': false, 'properties': { 'hookErrorMessage': inputSchemas.hookErrorMessage, 'operationErrorMessage': inputSchemas.operationErrorMessage, 'settleMs': inputSchemas.settleMs, 'throttle': inputSchemas.throttle }, 'required': ['hookErrorMessage', 'operationErrorMessage', 'settleMs', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'activeCount': expectedSchemas.activeCount, 'causeMessage': expectedSchemas.causeMessage, 'errorName': expectedSchemas.errorName, 'isComplete': expectedSchemas.isComplete, 'queuedCount': expectedSchemas.queuedCount }, 'required': ['activeCount', 'causeMessage', 'errorName', 'isComplete', 'queuedCount'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('drain-waits-for-active-and-queued', { 'additionalProperties': false, 'properties': { 'activeResult': inputSchemas.activeResult, 'queuedResult': inputSchemas.queuedResult, 'throttle': inputSchemas.throttle }, 'required': ['activeResult', 'queuedResult', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'isComplete': expectedSchemas.isComplete, 'results': expectedSchemas.results }, 'required': ['isComplete', 'results'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('drain-on-complete-returns-immediately', { 'additionalProperties': false, 'properties': { 'throttle': inputSchemas.throttle }, 'required': ['throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'isComplete': expectedSchemas.isComplete }, 'required': ['isComplete'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('drain-reuses-completion-promise', { 'additionalProperties': false, 'properties': { 'activeResult': inputSchemas.activeResult, 'settleMs': inputSchemas.settleMs, 'throttle': inputSchemas.throttle }, 'required': ['activeResult', 'settleMs', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'drainResolvedBeforeRelease': expectedSchemas.drainResolvedBeforeRelease, 'isComplete': expectedSchemas.isComplete, 'result': expectedSchemas.result }, 'required': ['drainResolvedBeforeRelease', 'isComplete', 'result'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('queued-operation-completes-after-release', { 'additionalProperties': false, 'properties': { 'activeResult': inputSchemas.activeResult, 'queuedResult': inputSchemas.queuedResult, 'settleMs': inputSchemas.settleMs, 'throttle': inputSchemas.throttle }, 'required': ['activeResult', 'queuedResult', 'settleMs', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'order': expectedSchemas.order }, 'required': ['order'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('on-window-slide-throws', { 'additionalProperties': false, 'properties': { 'activeResult': inputSchemas.activeResult, 'hookErrorMessage': inputSchemas.hookErrorMessage, 'queuedResult': inputSchemas.queuedResult, 'settleMs': inputSchemas.settleMs, 'throttle': inputSchemas.throttle }, 'required': ['activeResult', 'hookErrorMessage', 'queuedResult', 'settleMs', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': {  }, 'required': [], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('execute-after-abort-throws', { 'additionalProperties': false, 'properties': { 'activeResult': inputSchemas.activeResult, 'throttle': inputSchemas.throttle }, 'required': ['activeResult', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': {  }, 'required': [], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('execute-during-draining-throws', { 'additionalProperties': false, 'properties': { 'activeResult': inputSchemas.activeResult, 'throttle': inputSchemas.throttle }, 'required': ['activeResult', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': {  }, 'required': [], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('on-release-fires-exactly-once-still-busy', { 'additionalProperties': false, 'properties': { 'activeResult': inputSchemas.activeResult, 'queuedResult': inputSchemas.queuedResult, 'throttle': inputSchemas.throttle }, 'required': ['activeResult', 'queuedResult', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'releaseCount': expectedSchemas.releaseCount }, 'required': ['releaseCount'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('on-release-fires-exactly-once-became-idle', { 'additionalProperties': false, 'properties': { 'activeResult': inputSchemas.activeResult, 'throttle': inputSchemas.throttle }, 'required': ['activeResult', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'releaseCount': expectedSchemas.releaseCount }, 'required': ['releaseCount'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('on-release-fires-exactly-once-handoff-granted', { 'additionalProperties': false, 'properties': { 'activeResult': inputSchemas.activeResult, 'queuedResult': inputSchemas.queuedResult, 'throttle': inputSchemas.throttle }, 'required': ['activeResult', 'queuedResult', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'releaseCount': expectedSchemas.releaseCount }, 'required': ['releaseCount'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('on-release-fires-exactly-once-on-rejection', { 'additionalProperties': false, 'properties': { 'operationErrorMessage': inputSchemas.operationErrorMessage, 'throttle': inputSchemas.throttle }, 'required': ['operationErrorMessage', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'releaseCount': expectedSchemas.releaseCount }, 'required': ['releaseCount'], 'type': 'object' } as const),
      LifecycleScenarioCaseEntityBranches.scenarioSchema('on-release-fires-exactly-once-on-acquire-rollback', { 'additionalProperties': false, 'properties': { 'activeResult': inputSchemas.activeResult, 'hookErrorMessage': inputSchemas.hookErrorMessage, 'throttle': inputSchemas.throttle }, 'required': ['activeResult', 'hookErrorMessage', 'throttle'], 'type': 'object' } as const, { 'additionalProperties': false, 'properties': { 'releaseCount': expectedSchemas.releaseCount }, 'required': ['releaseCount'], 'type': 'object' } as const)
    ]
  } as const;

  export const Node = SchemaNode.defineOneOf({}, [
    LifecycleScenarioCaseEntityBranches.scenarioNode('abort-timeout-timed-out', SchemaNode.defineObject({ 'type': 'object' } as const, { 'abortOptions': inputNodes.abortOptions, 'activeResult': inputNodes.activeResult, 'throttle': inputNodes.throttle }, ['abortOptions', 'activeResult', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'abort': expectedNodes.abort }, ['abort'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('abort-timeout-completes', SchemaNode.defineObject({ 'type': 'object' } as const, { 'abortOptions': inputNodes.abortOptions, 'activeResult': inputNodes.activeResult, 'throttle': inputNodes.throttle }, ['abortOptions', 'activeResult', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'abort': expectedNodes.abort }, ['abort'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('abort-immediate-with-active-work', SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeResult': inputNodes.activeResult, 'throttle': inputNodes.throttle }, ['activeResult', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'abort': expectedNodes.abort }, ['abort'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('abort-zero-timeout-with-active-work', SchemaNode.defineObject({ 'type': 'object' } as const, { 'abortOptions': inputNodes.abortOptions, 'activeResult': inputNodes.activeResult, 'throttle': inputNodes.throttle }, ['abortOptions', 'activeResult', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'abort': expectedNodes.abort }, ['abort'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('abort-start-hook-throws', SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeResult': inputNodes.activeResult, 'hookErrorMessage': inputNodes.hookErrorMessage, 'throttle': inputNodes.throttle }, ['activeResult', 'hookErrorMessage', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, {  }, [] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('abort-after-abort-is-idempotent', SchemaNode.defineObject({ 'type': 'object' } as const, { 'throttle': inputNodes.throttle }, ['throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'abort': expectedNodes.abort, 'secondAbort': expectedNodes.secondAbort }, ['abort', 'secondAbort'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('abort-on-complete-skips-grace-period', SchemaNode.defineObject({ 'type': 'object' } as const, { 'abortOptions': inputNodes.abortOptions, 'throttle': inputNodes.throttle }, ['abortOptions', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'abort': expectedNodes.abort }, ['abort'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('abort-cancels-active-and-queued', SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeResult': inputNodes.activeResult, 'queuedResult': inputNodes.queuedResult, 'settleMs': inputNodes.settleMs, 'throttle': inputNodes.throttle }, ['activeResult', 'queuedResult', 'settleMs', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'abort': expectedNodes.abort, 'activeResolvedWithUndefined': expectedNodes.activeResolvedWithUndefined, 'isComplete': expectedNodes.isComplete, 'queuedResolvedWithUndefined': expectedNodes.queuedResolvedWithUndefined, 'queuedStarted': expectedNodes.queuedStarted, 'totalExecuted': expectedNodes.totalExecuted }, ['abort', 'activeResolvedWithUndefined', 'isComplete', 'queuedResolvedWithUndefined', 'queuedStarted', 'totalExecuted'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('abort-during-draining-cancels-active-and-queued', SchemaNode.defineObject({ 'type': 'object' } as const, { 'abortOptions': inputNodes.abortOptions, 'activeResult': inputNodes.activeResult, 'queuedResult': inputNodes.queuedResult, 'settleMs': inputNodes.settleMs, 'throttle': inputNodes.throttle }, ['abortOptions', 'activeResult', 'queuedResult', 'settleMs', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'abort': expectedNodes.abort, 'activeResolvedWithUndefined': expectedNodes.activeResolvedWithUndefined, 'isComplete': expectedNodes.isComplete, 'queuedResolvedWithUndefined': expectedNodes.queuedResolvedWithUndefined, 'queuedStarted': expectedNodes.queuedStarted, 'totalExecuted': expectedNodes.totalExecuted }, ['abort', 'activeResolvedWithUndefined', 'isComplete', 'queuedResolvedWithUndefined', 'queuedStarted', 'totalExecuted'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('on-acquire-throws', SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeResult': inputNodes.activeResult, 'hookErrorMessage': inputNodes.hookErrorMessage, 'throttle': inputNodes.throttle }, ['activeResult', 'hookErrorMessage', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeCount': expectedNodes.activeCount, 'isComplete': expectedNodes.isComplete }, ['activeCount', 'isComplete'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('on-release-throws', SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeResult': inputNodes.activeResult, 'hookErrorMessage': inputNodes.hookErrorMessage, 'throttle': inputNodes.throttle }, ['activeResult', 'hookErrorMessage', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'isComplete': expectedNodes.isComplete }, ['isComplete'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('on-contended-throws', SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeResult': inputNodes.activeResult, 'hookErrorMessage': inputNodes.hookErrorMessage, 'settleMs': inputNodes.settleMs, 'throttle': inputNodes.throttle }, ['activeResult', 'hookErrorMessage', 'settleMs', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeCount': expectedNodes.activeCount, 'activeResult': expectedNodes.activeResult, 'causeMessage': expectedNodes.causeMessage, 'errorName': expectedNodes.errorName, 'isComplete': expectedNodes.isComplete, 'queuedCount': expectedNodes.queuedCount }, ['activeCount', 'activeResult', 'causeMessage', 'errorName', 'isComplete', 'queuedCount'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('on-acquire-wait-throws', SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeResult': inputNodes.activeResult, 'hookErrorMessage': inputNodes.hookErrorMessage, 'settleMs': inputNodes.settleMs, 'throttle': inputNodes.throttle }, ['activeResult', 'hookErrorMessage', 'settleMs', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeCount': expectedNodes.activeCount, 'activeResult': expectedNodes.activeResult, 'causeMessage': expectedNodes.causeMessage, 'errorName': expectedNodes.errorName, 'isComplete': expectedNodes.isComplete, 'queuedCount': expectedNodes.queuedCount }, ['activeCount', 'activeResult', 'causeMessage', 'errorName', 'isComplete', 'queuedCount'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('on-reject-throws', SchemaNode.defineObject({ 'type': 'object' } as const, { 'hookErrorMessage': inputNodes.hookErrorMessage, 'operationErrorMessage': inputNodes.operationErrorMessage, 'settleMs': inputNodes.settleMs, 'throttle': inputNodes.throttle }, ['hookErrorMessage', 'operationErrorMessage', 'settleMs', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeCount': expectedNodes.activeCount, 'causeMessage': expectedNodes.causeMessage, 'errorName': expectedNodes.errorName, 'isComplete': expectedNodes.isComplete, 'queuedCount': expectedNodes.queuedCount }, ['activeCount', 'causeMessage', 'errorName', 'isComplete', 'queuedCount'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('drain-waits-for-active-and-queued', SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeResult': inputNodes.activeResult, 'queuedResult': inputNodes.queuedResult, 'throttle': inputNodes.throttle }, ['activeResult', 'queuedResult', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'isComplete': expectedNodes.isComplete, 'results': expectedNodes.results }, ['isComplete', 'results'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('drain-on-complete-returns-immediately', SchemaNode.defineObject({ 'type': 'object' } as const, { 'throttle': inputNodes.throttle }, ['throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'isComplete': expectedNodes.isComplete }, ['isComplete'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('drain-reuses-completion-promise', SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeResult': inputNodes.activeResult, 'settleMs': inputNodes.settleMs, 'throttle': inputNodes.throttle }, ['activeResult', 'settleMs', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'drainResolvedBeforeRelease': expectedNodes.drainResolvedBeforeRelease, 'isComplete': expectedNodes.isComplete, 'result': expectedNodes.result }, ['drainResolvedBeforeRelease', 'isComplete', 'result'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('queued-operation-completes-after-release', SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeResult': inputNodes.activeResult, 'queuedResult': inputNodes.queuedResult, 'settleMs': inputNodes.settleMs, 'throttle': inputNodes.throttle }, ['activeResult', 'queuedResult', 'settleMs', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'order': expectedNodes.order }, ['order'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('on-window-slide-throws', SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeResult': inputNodes.activeResult, 'hookErrorMessage': inputNodes.hookErrorMessage, 'queuedResult': inputNodes.queuedResult, 'settleMs': inputNodes.settleMs, 'throttle': inputNodes.throttle }, ['activeResult', 'hookErrorMessage', 'queuedResult', 'settleMs', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, {  }, [] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('execute-after-abort-throws', SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeResult': inputNodes.activeResult, 'throttle': inputNodes.throttle }, ['activeResult', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, {  }, [] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('execute-during-draining-throws', SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeResult': inputNodes.activeResult, 'throttle': inputNodes.throttle }, ['activeResult', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, {  }, [] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('on-release-fires-exactly-once-still-busy', SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeResult': inputNodes.activeResult, 'queuedResult': inputNodes.queuedResult, 'throttle': inputNodes.throttle }, ['activeResult', 'queuedResult', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'releaseCount': expectedNodes.releaseCount }, ['releaseCount'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('on-release-fires-exactly-once-became-idle', SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeResult': inputNodes.activeResult, 'throttle': inputNodes.throttle }, ['activeResult', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'releaseCount': expectedNodes.releaseCount }, ['releaseCount'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('on-release-fires-exactly-once-handoff-granted', SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeResult': inputNodes.activeResult, 'queuedResult': inputNodes.queuedResult, 'throttle': inputNodes.throttle }, ['activeResult', 'queuedResult', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'releaseCount': expectedNodes.releaseCount }, ['releaseCount'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('on-release-fires-exactly-once-on-rejection', SchemaNode.defineObject({ 'type': 'object' } as const, { 'operationErrorMessage': inputNodes.operationErrorMessage, 'throttle': inputNodes.throttle }, ['operationErrorMessage', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'releaseCount': expectedNodes.releaseCount }, ['releaseCount'] as const, { 'additionalProperties': false, 'patternProperties': {} })),
    LifecycleScenarioCaseEntityBranches.scenarioNode('on-release-fires-exactly-once-on-acquire-rollback', SchemaNode.defineObject({ 'type': 'object' } as const, { 'activeResult': inputNodes.activeResult, 'hookErrorMessage': inputNodes.hookErrorMessage, 'throttle': inputNodes.throttle }, ['activeResult', 'hookErrorMessage', 'throttle'] as const, { 'additionalProperties': false, 'patternProperties': {} }), SchemaNode.defineObject({ 'type': 'object' } as const, { 'releaseCount': expectedNodes.releaseCount }, ['releaseCount'] as const, { 'additionalProperties': false, 'patternProperties': {} }))
  ] as const);

  export type Type = NodeStaticType<typeof Node>;

  export const validate: EntityValidateFunctionInterface<Type> = EntityCompiler.compile<Type>(Schema);
  export const intake: EntityIntakeFunctionInterface<Type> = EntityCompiler.compileIntake<Type>(Schema);
  export const create: EntityCreateFunctionInterface<Type> = EntityCompiler.compileCreate<Type>(Schema);
}
