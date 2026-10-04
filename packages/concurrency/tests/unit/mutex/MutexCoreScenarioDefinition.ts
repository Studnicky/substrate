import type { SchemaNodeInterface } from '@studnicky/entity/interfaces';

import { SchemaNode } from '@studnicky/entity/types';
import { JsonObject } from '@studnicky/types/browser';

class MutexCoreSchemaMaterializer {
  static materialize(node: { readonly 'schema': object }): Record<string, unknown> {
    const result = MutexCoreSchemaMaterializer.materializeRecord(node.schema);
    return result;
  }

  private static isNode(value: object): boolean {
    const result = Object.hasOwn(value, 'schema')
      && Reflect.get(value, 'schema') !== null
      && typeof Reflect.get(value, 'schema') === 'object';
    return result;
  }

  private static materializeRecord(value: object): Record<string, unknown> {
    const entries = new Map<string, unknown>();
    const keys = Object.keys(value);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index]!;
      entries.set(key, MutexCoreSchemaMaterializer.materializeValue(Reflect.get(value, key)));
    }
    const result = JsonObject.fromEntries(entries);
    return result;
  }

  private static materializeValue(value: object | boolean | null | number | string): object | boolean | null | number | string {
    if (Array.isArray(value)) {
      const result = value.map((entry) => {
        const materializedEntry = MutexCoreSchemaMaterializer.materializeValue(entry);
        return materializedEntry;
      });
      return result;
    }
    if (typeof value === 'object' && value !== null) {
      if (MutexCoreSchemaMaterializer.isNode(value)) {
        const result = MutexCoreSchemaMaterializer.materializeRecord(Reflect.get(value, 'schema'));
        return result;
      }
      const result = MutexCoreSchemaMaterializer.materializeRecord(value);
      return result;
    }
    return value;
  }
}

class MutexCoreScenarioBranches {
  static readonly expectedNodes = {
    'activeLocksCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'complete': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'completeAfterRelease': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'completed': SchemaNode.defineOneOf({}, [
      SchemaNode.defineNumber({ 'type': 'number' } as const),
      SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineNumber({ 'type': 'number' } as const),
        undefined
      )
    ]),
    'created': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'drainOrder': SchemaNode.defineArray(
      { 'type': 'array' } as const,
      SchemaNode.defineNumber({ 'type': 'number' } as const),
      undefined
    ),
    'exclusive': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'externalMutationIgnored': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'first': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'hasActiveLocksCount': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'hasQueuedCount': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'hasTotalExecuted': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'independent': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'locked': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'lockedAfterClear': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'lockedAfterRelease': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'lockedKeys': SchemaNode.defineArray(
      { 'type': 'array' } as const,
      SchemaNode.defineString({ 'type': 'string' } as const),
      undefined
    ),
    'maximumQueueSize': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'observersNotified': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'queuedCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'queuedCountExcluded': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'queuedRejected': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'queueSize': SchemaNode.defineOneOf({}, [
      SchemaNode.defineNumber({ 'type': 'number' } as const),
      SchemaNode.defineArray(
        { 'type': 'array' } as const,
        SchemaNode.defineNumber({ 'type': 'number' } as const),
        undefined
      )
    ]),
    'queueSizeAfterClear': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'queueSizeAfterRelease': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'queueSizeAfterTimeout': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'rejected': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'rejects': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'released': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'releaseOrder': SchemaNode.defineArray(
      { 'type': 'array' } as const,
      SchemaNode.defineNumber({ 'type': 'number' } as const),
      undefined
    ),
    'releaseWorks': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'resolvedImmediately': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'result': SchemaNode.defineOneOf({}, [
      SchemaNode.defineString({ 'type': 'string' } as const),
      SchemaNode.defineNumber({ 'type': 'number' } as const)
    ]),
    'results': SchemaNode.defineArray(
      { 'type': 'array' } as const,
      SchemaNode.defineString({ 'type': 'string' } as const),
      undefined
    ),
    'runExclusive': SchemaNode.defineString({ 'type': 'string' } as const),
    'sameReference': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'sameValue': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'second': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'size': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'sizeAfterClear': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'throws': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'timeout': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'totalExecuted': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'waitedForAll': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'waitedForQueue': SchemaNode.defineBoolean({ 'type': 'boolean' } as const),
    'waitedForRelease': SchemaNode.defineBoolean({ 'type': 'boolean' } as const)
  } as const;

  static readonly inputNodes = {
    'batch': SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'acquireCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'observerCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'operationCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'overflowCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'queuedCount': SchemaNode.defineNumber({ 'type': 'number' } as const),
        'queuedPerKey': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, {
          'additionalProperties': SchemaNode.defineNumber({ 'type': 'number' } as const),
          'patternProperties': {}
        })
      },
      [] as const,
      { 'additionalProperties': false, 'patternProperties': {} }
    ),
    'delayMs': SchemaNode.defineNumber({ 'type': 'number' } as const),
    'delaysMs': SchemaNode.defineArray(
      { 'type': 'array' } as const,
      SchemaNode.defineNumber({ 'type': 'number' } as const),
      undefined
    ),
    'errorMessage': SchemaNode.defineString({ 'type': 'string' } as const),
    'key': SchemaNode.defineUnknown({} as const),
    'keys': SchemaNode.defineArray(
      { 'type': 'array' } as const,
      SchemaNode.defineString({ 'type': 'string' } as const),
      undefined
    ),
    'mutex': SchemaNode.defineObject({ 'type': 'object' } as const, {}, [] as const, {
      'additionalProperties': true,
      'patternProperties': {}
    }),
    'operations': SchemaNode.defineArray(
      { 'type': 'array' } as const,
      SchemaNode.defineString({ 'type': 'string' } as const),
      undefined
    ),
    'result': SchemaNode.defineString({ 'type': 'string' } as const),
    'value': SchemaNode.defineOneOf({}, [
      SchemaNode.defineString({ 'type': 'string' } as const),
      SchemaNode.defineNumber({ 'type': 'number' } as const)
    ])
  } as const;

  static scenarioNode<
    const TShape extends string,
    const TInputRequired extends readonly string[],
    const TInputNodes extends Record<TInputRequired[number], SchemaNodeInterface<unknown, unknown>>,
    const TExpectedRequired extends readonly string[],
    const TExpectedNodes extends Record<TExpectedRequired[number], SchemaNodeInterface<unknown, unknown>>
  >(
    shape: TShape,
    inputNodes: TInputNodes,
    inputRequired: TInputRequired,
    expectedNodes: TExpectedNodes,
    expectedRequired: TExpectedRequired
  ) {
    const result = SchemaNode.defineObject(
      { 'type': 'object' } as const,
      {
        'description': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'expected': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          expectedNodes,
          expectedRequired,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'input': SchemaNode.defineObject(
          { 'type': 'object' } as const,
          inputNodes,
          inputRequired,
          { 'additionalProperties': false, 'patternProperties': {} }
        ),
        'name': SchemaNode.defineString({ 'minLength': 1, 'type': 'string' } as const),
        'shape': SchemaNode.defineConst({}, shape)
      },
      ['description', 'expected', 'input', 'name', 'shape'] as const,
      { 'additionalProperties': false, 'patternProperties': {} }
    );
    return result;
  }
}

/** Node-first contract for all mutex core test scenarios. */
export class MutexCoreScenarioDefinition {
  public static readonly Node = SchemaNode.defineOneOf({}, [
    MutexCoreScenarioBranches.scenarioNode(
      'config-defaults',
      { 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['mutex'] as const,
      { 'maximumQueueSize': MutexCoreScenarioBranches.expectedNodes.maximumQueueSize, 'timeout': MutexCoreScenarioBranches.expectedNodes.timeout },
      ['maximumQueueSize', 'timeout'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'config-empty',
      { 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['mutex'] as const,
      { 'maximumQueueSize': MutexCoreScenarioBranches.expectedNodes.maximumQueueSize, 'timeout': MutexCoreScenarioBranches.expectedNodes.timeout },
      ['maximumQueueSize', 'timeout'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'config-no-limits',
      { 'key': MutexCoreScenarioBranches.inputNodes.key, 'mutex': MutexCoreScenarioBranches.inputNodes.mutex, 'result': MutexCoreScenarioBranches.inputNodes.result },
      ['key', 'mutex', 'result'] as const,
      { 'runExclusive': MutexCoreScenarioBranches.expectedNodes.runExclusive },
      ['runExclusive'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'config-full',
      { 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['mutex'] as const,
      { 'maximumQueueSize': MutexCoreScenarioBranches.expectedNodes.maximumQueueSize, 'timeout': MutexCoreScenarioBranches.expectedNodes.timeout },
      ['maximumQueueSize', 'timeout'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'config-partial-maxQueue-5',
      { 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['mutex'] as const,
      { 'maximumQueueSize': MutexCoreScenarioBranches.expectedNodes.maximumQueueSize, 'timeout': MutexCoreScenarioBranches.expectedNodes.timeout },
      ['maximumQueueSize', 'timeout'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'config-partial-maxQueue-50',
      { 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['mutex'] as const,
      { 'maximumQueueSize': MutexCoreScenarioBranches.expectedNodes.maximumQueueSize, 'timeout': MutexCoreScenarioBranches.expectedNodes.timeout },
      ['maximumQueueSize', 'timeout'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'config-partial-timeout',
      { 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['mutex'] as const,
      { 'maximumQueueSize': MutexCoreScenarioBranches.expectedNodes.maximumQueueSize, 'timeout': MutexCoreScenarioBranches.expectedNodes.timeout },
      ['maximumQueueSize', 'timeout'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'config-invalid-maxQueue-negative',
      { 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['mutex'] as const,
      { 'throws': MutexCoreScenarioBranches.expectedNodes.throws },
      ['throws'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'config-invalid-timeout-negative',
      { 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['mutex'] as const,
      { 'throws': MutexCoreScenarioBranches.expectedNodes.throws },
      ['throws'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'config-invalid-maxQueue-float',
      { 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['mutex'] as const,
      { 'throws': MutexCoreScenarioBranches.expectedNodes.throws },
      ['throws'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'config-invalid-timeout-float',
      { 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['mutex'] as const,
      { 'throws': MutexCoreScenarioBranches.expectedNodes.throws },
      ['throws'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'config-unknown-key',
      { 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['mutex'] as const,
      { 'throws': MutexCoreScenarioBranches.expectedNodes.throws },
      ['throws'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'validateConfig-valid',
      { 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['mutex'] as const,
      { 'maximumQueueSize': MutexCoreScenarioBranches.expectedNodes.maximumQueueSize, 'timeout': MutexCoreScenarioBranches.expectedNodes.timeout },
      ['maximumQueueSize', 'timeout'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'validateConfig-invalid',
      { 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['mutex'] as const,
      { 'throws': MutexCoreScenarioBranches.expectedNodes.throws },
      ['throws'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'config-return-copy',
      { 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['mutex'] as const,
      { 'sameReference': MutexCoreScenarioBranches.expectedNodes.sameReference, 'sameValue': MutexCoreScenarioBranches.expectedNodes.sameValue },
      ['sameReference', 'sameValue'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'config-external-modification',
      { 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['mutex'] as const,
      {
        'externalMutationIgnored': MutexCoreScenarioBranches.expectedNodes.externalMutationIgnored,
        'maximumQueueSize': MutexCoreScenarioBranches.expectedNodes.maximumQueueSize
      },
      ['externalMutationIgnored', 'maximumQueueSize'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'create-no-config',
      { 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['mutex'] as const,
      { 'created': MutexCoreScenarioBranches.expectedNodes.created },
      ['created'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'create-partial-config',
      { 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['mutex'] as const,
      { 'created': MutexCoreScenarioBranches.expectedNodes.created, 'maximumQueueSize': MutexCoreScenarioBranches.expectedNodes.maximumQueueSize },
      ['created', 'maximumQueueSize'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'create-functional',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      { 'locked': MutexCoreScenarioBranches.expectedNodes.locked, 'releaseWorks': MutexCoreScenarioBranches.expectedNodes.releaseWorks },
      ['locked', 'releaseWorks'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'create-string-key',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      { 'result': MutexCoreScenarioBranches.expectedNodes.result },
      ['result'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'create-number-key',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      { 'result': MutexCoreScenarioBranches.expectedNodes.result },
      ['result'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'create-composite-key',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      { 'result': MutexCoreScenarioBranches.expectedNodes.result },
      ['result'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'acquire-disposable',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      {},
      [] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'acquire-release',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      { 'locked': MutexCoreScenarioBranches.expectedNodes.locked, 'released': MutexCoreScenarioBranches.expectedNodes.released },
      ['locked', 'released'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'sequential-acquisitions',
      { 'batch': MutexCoreScenarioBranches.inputNodes.batch, 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['batch', 'key'] as const,
      { 'locked': MutexCoreScenarioBranches.expectedNodes.locked, 'releaseOrder': MutexCoreScenarioBranches.expectedNodes.releaseOrder },
      ['locked', 'releaseOrder'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'different-keys',
      { 'keys': MutexCoreScenarioBranches.inputNodes.keys },
      ['keys'] as const,
      { 'independent': MutexCoreScenarioBranches.expectedNodes.independent, 'lockedKeys': MutexCoreScenarioBranches.expectedNodes.lockedKeys },
      ['independent', 'lockedKeys'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'sync-return-string',
      { 'key': MutexCoreScenarioBranches.inputNodes.key, 'value': MutexCoreScenarioBranches.inputNodes.value },
      ['key', 'value'] as const,
      { 'result': MutexCoreScenarioBranches.expectedNodes.result },
      ['result'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'sync-return-number',
      { 'key': MutexCoreScenarioBranches.inputNodes.key, 'value': MutexCoreScenarioBranches.inputNodes.value },
      ['key', 'value'] as const,
      { 'result': MutexCoreScenarioBranches.expectedNodes.result },
      ['result'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'result-validator-rejects',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      { 'rejected': MutexCoreScenarioBranches.expectedNodes.rejected },
      ['rejected'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'async-exclusive',
      { 'delayMs': MutexCoreScenarioBranches.inputNodes.delayMs, 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['delayMs', 'key'] as const,
      { 'exclusive': MutexCoreScenarioBranches.expectedNodes.exclusive },
      ['exclusive'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'async-return-value',
      { 'key': MutexCoreScenarioBranches.inputNodes.key, 'result': MutexCoreScenarioBranches.inputNodes.result },
      ['key', 'result'] as const,
      { 'result': MutexCoreScenarioBranches.expectedNodes.result },
      ['result'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'releases-on-throw',
      { 'errorMessage': MutexCoreScenarioBranches.inputNodes.errorMessage, 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['errorMessage', 'key'] as const,
      { 'released': MutexCoreScenarioBranches.expectedNodes.released, 'throws': MutexCoreScenarioBranches.expectedNodes.throws },
      ['released', 'throws'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'multiple-operations',
      { 'batch': MutexCoreScenarioBranches.inputNodes.batch, 'key': MutexCoreScenarioBranches.inputNodes.key, 'operations': MutexCoreScenarioBranches.inputNodes.operations },
      ['batch', 'key', 'operations'] as const,
      { 'results': MutexCoreScenarioBranches.expectedNodes.results, 'totalExecuted': MutexCoreScenarioBranches.expectedNodes.totalExecuted },
      ['results', 'totalExecuted'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'burst-timeout-drains-queue',
      { 'batch': MutexCoreScenarioBranches.inputNodes.batch, 'key': MutexCoreScenarioBranches.inputNodes.key, 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['batch', 'key', 'mutex'] as const,
      { 'drainOrder': MutexCoreScenarioBranches.expectedNodes.drainOrder, 'rejects': MutexCoreScenarioBranches.expectedNodes.rejects },
      ['drainOrder', 'rejects'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'queued-timeout-unlinks-middle-node',
      { 'batch': MutexCoreScenarioBranches.inputNodes.batch, 'key': MutexCoreScenarioBranches.inputNodes.key, 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['batch', 'key', 'mutex'] as const,
      {
        'queueSizeAfterRelease': MutexCoreScenarioBranches.expectedNodes.queueSizeAfterRelease,
        'queueSizeAfterTimeout': MutexCoreScenarioBranches.expectedNodes.queueSizeAfterTimeout
      },
      ['queueSizeAfterRelease', 'queueSizeAfterTimeout'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'isLocked-initial-false',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      { 'locked': MutexCoreScenarioBranches.expectedNodes.locked },
      ['locked'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'queue-size-exceeded',
      { 'batch': MutexCoreScenarioBranches.inputNodes.batch, 'key': MutexCoreScenarioBranches.inputNodes.key, 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['batch', 'key', 'mutex'] as const,
      {},
      [] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'isLocked-true',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      { 'locked': MutexCoreScenarioBranches.expectedNodes.locked },
      ['locked'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'isLocked-after-release',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      { 'lockedAfterRelease': MutexCoreScenarioBranches.expectedNodes.lockedAfterRelease },
      ['lockedAfterRelease'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'isLocked-multiple-keys',
      { 'keys': MutexCoreScenarioBranches.inputNodes.keys },
      ['keys'] as const,
      { 'first': MutexCoreScenarioBranches.expectedNodes.first, 'second': MutexCoreScenarioBranches.expectedNodes.second },
      ['first', 'second'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'queueSize-initial-zero',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      { 'queueSize': MutexCoreScenarioBranches.expectedNodes.queueSize },
      ['queueSize'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'queueSize-held-empty',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      { 'queueSize': MutexCoreScenarioBranches.expectedNodes.queueSize },
      ['queueSize'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'queueSize-tracks-queued',
      { 'batch': MutexCoreScenarioBranches.inputNodes.batch, 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['batch', 'key'] as const,
      { 'queueSize': MutexCoreScenarioBranches.expectedNodes.queueSize },
      ['queueSize'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'queueSize-decrements',
      { 'batch': MutexCoreScenarioBranches.inputNodes.batch, 'key': MutexCoreScenarioBranches.inputNodes.key, 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['batch', 'key', 'mutex'] as const,
      { 'queueSize': MutexCoreScenarioBranches.expectedNodes.queueSize },
      ['queueSize'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'size-initial-zero',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      { 'size': MutexCoreScenarioBranches.expectedNodes.size },
      ['size'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'size-active-locks',
      { 'keys': MutexCoreScenarioBranches.inputNodes.keys },
      ['keys'] as const,
      { 'size': MutexCoreScenarioBranches.expectedNodes.size },
      ['size'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'size-no-queued',
      { 'batch': MutexCoreScenarioBranches.inputNodes.batch, 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['batch', 'key'] as const,
      { 'queuedCountExcluded': MutexCoreScenarioBranches.expectedNodes.queuedCountExcluded, 'size': MutexCoreScenarioBranches.expectedNodes.size },
      ['queuedCountExcluded', 'size'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'clear-clears-all',
      { 'keys': MutexCoreScenarioBranches.inputNodes.keys },
      ['keys'] as const,
      { 'sizeAfterClear': MutexCoreScenarioBranches.expectedNodes.sizeAfterClear },
      ['sizeAfterClear'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'clear-empty',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      { 'sizeAfterClear': MutexCoreScenarioBranches.expectedNodes.sizeAfterClear },
      ['sizeAfterClear'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'clear-rejects-queued-acquisitions',
      { 'batch': MutexCoreScenarioBranches.inputNodes.batch, 'key': MutexCoreScenarioBranches.inputNodes.key, 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['batch', 'key', 'mutex'] as const,
      {
        'lockedAfterClear': MutexCoreScenarioBranches.expectedNodes.lockedAfterClear,
        'queuedRejected': MutexCoreScenarioBranches.expectedNodes.queuedRejected,
        'queueSizeAfterClear': MutexCoreScenarioBranches.expectedNodes.queueSizeAfterClear
      },
      ['lockedAfterClear', 'queuedRejected', 'queueSizeAfterClear'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'getConfig-current',
      { 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['mutex'] as const,
      { 'maximumQueueSize': MutexCoreScenarioBranches.expectedNodes.maximumQueueSize, 'timeout': MutexCoreScenarioBranches.expectedNodes.timeout },
      ['maximumQueueSize', 'timeout'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'getConfig-default',
      { 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['mutex'] as const,
      { 'maximumQueueSize': MutexCoreScenarioBranches.expectedNodes.maximumQueueSize, 'timeout': MutexCoreScenarioBranches.expectedNodes.timeout },
      ['maximumQueueSize', 'timeout'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'stats-initial',
      { 'key': MutexCoreScenarioBranches.inputNodes.key, 'mutex': MutexCoreScenarioBranches.inputNodes.mutex },
      ['key', 'mutex'] as const,
      {
        'activeLocksCount': MutexCoreScenarioBranches.expectedNodes.activeLocksCount,
        'maximumQueueSize': MutexCoreScenarioBranches.expectedNodes.maximumQueueSize,
        'queuedCount': MutexCoreScenarioBranches.expectedNodes.queuedCount,
        'timeout': MutexCoreScenarioBranches.expectedNodes.timeout,
        'totalExecuted': MutexCoreScenarioBranches.expectedNodes.totalExecuted
      },
      [
        'activeLocksCount',
        'maximumQueueSize',
        'queuedCount',
        'timeout',
        'totalExecuted'
      ] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'stats-api-shape',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      {
        'hasActiveLocksCount': MutexCoreScenarioBranches.expectedNodes.hasActiveLocksCount,
        'hasQueuedCount': MutexCoreScenarioBranches.expectedNodes.hasQueuedCount,
        'hasTotalExecuted': MutexCoreScenarioBranches.expectedNodes.hasTotalExecuted
      },
      ['hasActiveLocksCount', 'hasQueuedCount', 'hasTotalExecuted'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'stats-active-locks',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      { 'activeLocksCount': MutexCoreScenarioBranches.expectedNodes.activeLocksCount },
      ['activeLocksCount'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'stats-multiple-active',
      { 'keys': MutexCoreScenarioBranches.inputNodes.keys },
      ['keys'] as const,
      { 'activeLocksCount': MutexCoreScenarioBranches.expectedNodes.activeLocksCount },
      ['activeLocksCount'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'stats-queued',
      { 'batch': MutexCoreScenarioBranches.inputNodes.batch, 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['batch', 'key'] as const,
      { 'queuedCount': MutexCoreScenarioBranches.expectedNodes.queuedCount },
      ['queuedCount'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'stats-queued-multi-key',
      { 'batch': MutexCoreScenarioBranches.inputNodes.batch, 'keys': MutexCoreScenarioBranches.inputNodes.keys },
      ['batch', 'keys'] as const,
      {
        'activeLocksCount': MutexCoreScenarioBranches.expectedNodes.activeLocksCount,
        'queuedCount': MutexCoreScenarioBranches.expectedNodes.queuedCount,
        'totalExecuted': MutexCoreScenarioBranches.expectedNodes.totalExecuted
      },
      ['activeLocksCount', 'queuedCount', 'totalExecuted'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'stats-total-executed',
      { 'batch': MutexCoreScenarioBranches.inputNodes.batch, 'keys': MutexCoreScenarioBranches.inputNodes.keys },
      ['batch', 'keys'] as const,
      {
        'activeLocksCount': MutexCoreScenarioBranches.expectedNodes.activeLocksCount,
        'queuedCount': MutexCoreScenarioBranches.expectedNodes.queuedCount,
        'totalExecuted': MutexCoreScenarioBranches.expectedNodes.totalExecuted
      },
      ['activeLocksCount', 'queuedCount', 'totalExecuted'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'isComplete-initial-true',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      { 'complete': MutexCoreScenarioBranches.expectedNodes.complete },
      ['complete'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'isComplete-held-false',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      { 'complete': MutexCoreScenarioBranches.expectedNodes.complete },
      ['complete'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'isComplete-after-release-true',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      { 'completeAfterRelease': MutexCoreScenarioBranches.expectedNodes.completeAfterRelease },
      ['completeAfterRelease'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'isComplete-queued-false',
      { 'batch': MutexCoreScenarioBranches.inputNodes.batch, 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['batch', 'key'] as const,
      { 'complete': MutexCoreScenarioBranches.expectedNodes.complete },
      ['complete'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'isComplete-multi-active-false',
      { 'keys': MutexCoreScenarioBranches.inputNodes.keys },
      ['keys'] as const,
      { 'complete': MutexCoreScenarioBranches.expectedNodes.complete },
      ['complete'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'completeQueue-immediate',
      { 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['key'] as const,
      { 'resolvedImmediately': MutexCoreScenarioBranches.expectedNodes.resolvedImmediately },
      ['resolvedImmediately'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'completeQueue-waits-active',
      { 'delayMs': MutexCoreScenarioBranches.inputNodes.delayMs, 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['delayMs', 'key'] as const,
      { 'waitedForRelease': MutexCoreScenarioBranches.expectedNodes.waitedForRelease },
      ['waitedForRelease'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'completeQueue-waits-queued',
      { 'batch': MutexCoreScenarioBranches.inputNodes.batch, 'delayMs': MutexCoreScenarioBranches.inputNodes.delayMs, 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['batch', 'delayMs', 'key'] as const,
      { 'completed': MutexCoreScenarioBranches.expectedNodes.completed, 'waitedForQueue': MutexCoreScenarioBranches.expectedNodes.waitedForQueue },
      ['completed', 'waitedForQueue'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'completeQueue-waits-multi-key',
      { 'delaysMs': MutexCoreScenarioBranches.inputNodes.delaysMs, 'keys': MutexCoreScenarioBranches.inputNodes.keys },
      ['delaysMs', 'keys'] as const,
      { 'completed': MutexCoreScenarioBranches.expectedNodes.completed, 'waitedForAll': MutexCoreScenarioBranches.expectedNodes.waitedForAll },
      ['completed', 'waitedForAll'] as const
    ),
    MutexCoreScenarioBranches.scenarioNode(
      'completeQueue-multiple-observers',
      { 'batch': MutexCoreScenarioBranches.inputNodes.batch, 'key': MutexCoreScenarioBranches.inputNodes.key },
      ['batch', 'key'] as const,
      { 'complete': MutexCoreScenarioBranches.expectedNodes.complete, 'observersNotified': MutexCoreScenarioBranches.expectedNodes.observersNotified },
      ['complete', 'observersNotified'] as const
    )
  ] as const);

  public static readonly Schema = MutexCoreSchemaMaterializer.materialize(
    MutexCoreScenarioDefinition.Node
  );
}
