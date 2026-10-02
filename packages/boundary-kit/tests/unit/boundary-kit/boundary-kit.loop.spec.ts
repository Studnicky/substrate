import type { ErrorClassifierFunctionInterface } from '@studnicky/errors/browser';
import type { CircuitBreakerOptionsEntity } from '@studnicky/resilience/entities';
import type { RetryConfigInterface } from '@studnicky/retry/interfaces';
import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';
import type { ThrottleConfigEntity } from '@studnicky/throttle/entities';

import { RuntimeError } from '@studnicky/errors/node';
import { CircuitBreaker, type CircuitBreakerCollaboratorsInterface, CircuitBreakerOpenError } from '@studnicky/resilience/node';
import { MaximumRetriesExceededError, Retry } from '@studnicky/retry/node';
import { ScenarioSuite } from '@studnicky/scenario-kit/node';
import { Throttle } from '@studnicky/throttle/node';
import assert from 'node:assert/strict';

import type { BoundaryKitConfigInterface } from '../../../src/interfaces/index.js';

import { BoundaryKitAbortedError } from '../../../src/errors/BoundaryKitAbortedError.js';
import { BoundaryKit } from '../../../src/index.js';
import scenarioGroups from './boundary-kit.scenarios.json' with { 'type': 'json' };
import { BoundaryKitScenarioCaseEntity } from './entities/BoundaryKitScenarioCaseEntity.js';

class SubclassedThrottle extends Throttle {
  acquireCount = 0;

  constructor(config?: ThrottleConfigEntity.Type) {
    super(config);
  }

  protected override onAcquire(): void {
    this.acquireCount += 1;
  }
}

class SubclassedCircuitBreaker extends CircuitBreaker {
  successCount = 0;

  constructor(config: unknown, collaborators: CircuitBreakerCollaboratorsInterface = {}) {
    super(config, collaborators);
  }

  protected override onSuccess(): void {
    this.successCount += 1;
  }
}

class SubclassedRetry extends Retry {
  attemptCount = 0;

  constructor(config?: RetryConfigInterface) {
    super(config ?? {});
  }

  protected override onAttempt(): void {
    this.attemptCount += 1;
  }
}

class BoundaryKitRunners {
  private static createConstantClassifier(descriptor: { 'reason': string; 'retryable': boolean }): ErrorClassifierFunctionInterface {
    const classifier: ErrorClassifierFunctionInterface = () => {
      const classification = { 'reason': descriptor.reason, 'retryable': descriptor.retryable };
      return classification;
    };
    return classifier;
  }

  private static materializeRetryConfig(config: { 'errorClassifier'?: { 'reason': string; 'retryable': boolean; 'shape': 'constant' }; 'maximumRetries'?: number }): RetryConfigInterface {
    const { errorClassifier, ...serializableConfig } = config;

    return {
      ...serializableConfig,
      ...(errorClassifier === undefined ? {} : { 'errorClassifier': BoundaryKitRunners.createConstantClassifier(errorClassifier) })
    };
  }

  private static materializeBoundaryKitConfig(
    descriptor: { 'circuitBreaker'?: CircuitBreakerOptionsEntity.InputType; 'retry'?: { 'errorClassifier'?: { 'reason': string; 'retryable': boolean; 'shape': 'constant' }; 'maximumRetries'?: number }; 'throttle'?: ThrottleConfigEntity.Type },
    runtimeDeps: { 'circuitBreaker'?: CircuitBreaker; 'retry'?: Retry; 'throttle'?: Throttle } = {}
  ): BoundaryKitConfigInterface {
    const circuitBreaker = runtimeDeps.circuitBreaker ?? descriptor.circuitBreaker;
    const retry = runtimeDeps.retry ?? (descriptor.retry === undefined ? undefined : BoundaryKitRunners.materializeRetryConfig(descriptor.retry));
    const throttle = runtimeDeps.throttle ?? descriptor.throttle;

    return {
      ...(circuitBreaker === undefined ? {} : { 'circuitBreaker': circuitBreaker }),
      ...(retry === undefined ? {} : { 'retry': retry }),
      ...(throttle === undefined ? {} : { 'throttle': throttle })
    };
  }

  private static materializePrebuiltBoundaryKit(
    descriptor: { 'circuitBreaker': CircuitBreakerOptionsEntity.InputType; 'retry': { 'errorClassifier'?: { 'reason': string; 'retryable': boolean; 'shape': 'constant' }; 'maximumRetries'?: number }; 'throttle': ThrottleConfigEntity.Type }
  ): {
    'circuitBreaker': SubclassedCircuitBreaker;
    'config': BoundaryKitConfigInterface;
    'retry': SubclassedRetry;
    'throttle': SubclassedThrottle;
  } {
    const throttle = new SubclassedThrottle(descriptor.throttle);
    const circuitBreaker = new SubclassedCircuitBreaker(descriptor.circuitBreaker);
    const retry = new SubclassedRetry(BoundaryKitRunners.materializeRetryConfig(descriptor.retry));

    return {
      'circuitBreaker': circuitBreaker,
      'config': BoundaryKitRunners.materializeBoundaryKitConfig(descriptor, { 'circuitBreaker': circuitBreaker, 'retry': retry, 'throttle': throttle }),
      'retry': retry,
      'throttle': throttle
    };
  }

  private static materializeTrackedCircuitBreakerKit(
    descriptor: { 'circuitBreaker': CircuitBreakerOptionsEntity.InputType; 'retry': { 'errorClassifier'?: { 'reason': string; 'retryable': boolean; 'shape': 'constant' }; 'maximumRetries'?: number } }
  ): { 'circuitBreaker': CircuitBreaker; 'kit': BoundaryKit } {
    const circuitBreaker = CircuitBreaker.create(descriptor.circuitBreaker);

    return {
      'circuitBreaker': circuitBreaker,
      'kit': BoundaryKit.create(BoundaryKitRunners.materializeBoundaryKitConfig(descriptor, { 'circuitBreaker': circuitBreaker }))
    };
  }

  private static materializeAbortBoundaryKit(
    descriptor: { 'throttle': ThrottleConfigEntity.Type }
  ): { 'kit': BoundaryKit; 'throttle': Throttle } {
    const throttle = Throttle.create(descriptor.throttle);

    return {
      'kit': BoundaryKit.create(BoundaryKitRunners.materializeBoundaryKitConfig(descriptor, { 'throttle': throttle })),
      'throttle': throttle
    };
  }

  private static createExecuteBatch<T>(batch: { 'callCount': number }, execute: () => Promise<T>): Promise<T>[] {
    const result: Promise<T>[] = [];
    for (let i = 0; i < batch.callCount; i += 1) {
      result.push(execute());
    }
    return result;
  }

  static async 'circuit-breaker-open'(scenarioCase: ScenarioCaseOfType<BoundaryKitScenarioCaseEntity.Type, 'circuit-breaker-open'>): Promise<void> {
    const { circuitBreaker, kit } = BoundaryKitRunners.materializeTrackedCircuitBreakerKit(scenarioCase.input.boundaryKit.config);

    let callCount = 0;

    const alwaysFails = (): Promise<never> => {
      callCount += 1;
      const error = RuntimeError.create('always fails');
      const result = Promise.reject(error);
      return result;
    };

    await assert.rejects(
      async () => {
        const result = await kit.execute(alwaysFails);
        return result;
      },
      MaximumRetriesExceededError
    );
    assert.equal(callCount, scenarioCase.expected.callCount);
    assert.equal(circuitBreaker.state, scenarioCase.expected.breakerStateAfterFirst);

    await assert.rejects(
      async () => {
        const result = await kit.execute(alwaysFails);
        return result;
      },
      MaximumRetriesExceededError
    );
    assert.equal(callCount, scenarioCase.expected.callCount * 2);
    assert.equal(circuitBreaker.state, scenarioCase.expected.breakerStateAfterSecond);

    await assert.rejects(
      async () => {
        const result = await kit.execute(alwaysFails);
        return result;
      },
      (error) => {
        assert.ok(error instanceof CircuitBreakerOpenError);
        assert.equal(error.constructor.name, scenarioCase.expected.rejectionName);
        return true;
      }
    );
    assert.equal(callCount, scenarioCase.expected.callCount * 2);
  }

  static async 'default-retry'(scenarioCase: ScenarioCaseOfType<BoundaryKitScenarioCaseEntity.Type, 'default-retry'>): Promise<void> {
    const kit = BoundaryKit.create();
    let callCount = 0;

    const flaky = (): Promise<string> => {
      callCount += 1;

      if (callCount <= scenarioCase.input.boundaryKit.failuresBeforeSuccess) {
        const error = RuntimeError.create('transient failure');
        const result = Promise.reject(error);
        return result;
      }

      const result = Promise.resolve(scenarioCase.expected.result);
      return result;
    };

    const result = await kit.execute(flaky);
    assert.equal(result, scenarioCase.expected.result);
    assert.equal(callCount, scenarioCase.expected.callCount);
  }

  static async 'plain-config'(scenarioCase: ScenarioCaseOfType<BoundaryKitScenarioCaseEntity.Type, 'plain-config'>): Promise<void> {
    const kit = BoundaryKit.create(BoundaryKitRunners.materializeBoundaryKitConfig(scenarioCase.input.boundaryKit.config));

    const result = await kit.execute(() => {
      const resolved = Promise.resolve(scenarioCase.expected.result);
      return resolved;
    });
    assert.equal(result, scenarioCase.expected.result);
  }

  static async 'prebuilt-instances'(scenarioCase: ScenarioCaseOfType<BoundaryKitScenarioCaseEntity.Type, 'prebuilt-instances'>): Promise<void> {
    const { circuitBreaker, config, retry, throttle } = BoundaryKitRunners.materializePrebuiltBoundaryKit(scenarioCase.input.boundaryKit.prebuiltConfig);
    const kit = BoundaryKit.create(config);

    await kit.execute(() => {
      const settled = Promise.resolve('ok');
      return settled;
    });

    assert.equal(throttle.acquireCount, scenarioCase.expected.acquireCount);
    assert.equal(circuitBreaker.successCount, scenarioCase.expected.successCount);
    assert.equal(retry.attemptCount, scenarioCase.expected.attemptCount);
  }

  static async 'throttle-bound'(scenarioCase: ScenarioCaseOfType<BoundaryKitScenarioCaseEntity.Type, 'throttle-bound'>): Promise<void> {
    const concurrencyLimit = scenarioCase.input.boundaryKit.config.throttle.concurrencyLimit;
    const kit = BoundaryKit.create(BoundaryKitRunners.materializeBoundaryKitConfig(scenarioCase.input.boundaryKit.config));

    let currentlyActiveCount = 0;
    let maximumCurrentlyActiveCount = 0;

    const trackedWork = async (): Promise<number> => {
      currentlyActiveCount += 1;
      maximumCurrentlyActiveCount = Math.max(maximumCurrentlyActiveCount, currentlyActiveCount);

      await new Promise((resolve) => {
        setTimeout(resolve, scenarioCase.input.boundaryKit.workDelayMs);
      });

      currentlyActiveCount -= 1;
      return currentlyActiveCount;
    };

    const executeBatchCalls = BoundaryKitRunners.createExecuteBatch(scenarioCase.input.batch, () => {
      const pending = kit.execute(trackedWork);
      return pending;
    });
    await Promise.all(executeBatchCalls);

    assert.equal(maximumCurrentlyActiveCount, scenarioCase.expected.maximumObservedActive);
    assert.equal(maximumCurrentlyActiveCount, concurrencyLimit);
  }

  static async 'undefined-result-vs-abort'(scenarioCase: ScenarioCaseOfType<BoundaryKitScenarioCaseEntity.Type, 'undefined-result-vs-abort'>): Promise<void> {
    const kit = BoundaryKit.create();

    let ran = false;
    const voidWork = (): Promise<void> => {
      ran = true;
      const settled = Promise.resolve();
      return settled;
    };

    const result = await kit.execute(voidWork);
    assert.equal(result, undefined);
    assert.equal(ran, true);

    const { 'kit': abortKit, throttle } = BoundaryKitRunners.materializeAbortBoundaryKit(scenarioCase.input.boundaryKit.abortConfig);

    let abortedRan = false;
    const blockingWork = async (): Promise<string> => {
      await new Promise((resolve) => {
        setTimeout(resolve, scenarioCase.input.boundaryKit.abortDelayMs);
      });
      return 'done';
    };
    const queuedWork = (): Promise<void> => {
      abortedRan = true;
      const settled = Promise.resolve();
      return settled;
    };

    const first = abortKit.execute(blockingWork);
    const queued = abortKit.execute(queuedWork);

    await throttle.abort();

    await first.catch(() => {});
    await assert.rejects(
      async () => {
        const queuedResult = await queued;
        return queuedResult;
      },
      BoundaryKitAbortedError
    );
    assert.equal(abortedRan, scenarioCase.expected.abortedRan);
  }
}

ScenarioSuite.register({
  'entity': BoundaryKitScenarioCaseEntity,
  'file': scenarioGroups,
  'name': 'BoundaryKit',
  'runners': BoundaryKitRunners
});
