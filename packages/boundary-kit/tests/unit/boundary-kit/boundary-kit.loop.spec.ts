import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CircuitBreaker, CircuitBreakerOpenError, type CircuitBreakerOptionsInterface } from '@studnicky/resilience';
import { MaximumRetriesExceededError, Retry } from '@studnicky/retry';
import type { RetryConfigInterface } from '@studnicky/retry/interfaces';
import { Throttle } from '@studnicky/throttle';
import type { ThrottleConfigEntity } from '@studnicky/throttle/entities';

import { BoundaryKit } from '../../../src/index.js';
import type { BoundaryKitConfigInterface } from '../../../src/interfaces/index.js';
import { BoundaryKitAbortedError } from '../../../src/errors/BoundaryKitAbortedError.js';
import scenarioGroups from './boundary-kit.scenarios.json' with { type: 'json' };

type RetryClassifierDescriptor = {
  shape: 'constant';
  reason: string;
  retryable: boolean;
};

type RetryConfigDescriptor = {
  errorClassifier?: RetryClassifierDescriptor;
  maximumRetries?: number;
};

type BoundaryKitConfigDescriptor = {
  circuitBreaker?: CircuitBreakerOptionsInterface;
  retry?: RetryConfigDescriptor;
  throttle?: ThrottleConfigEntity.Type;
};

type BoundaryKitRuntimeDeps = {
  circuitBreaker?: CircuitBreaker;
  retry?: Retry;
  throttle?: Throttle;
};

type BatchInput = {
  callCount: number;
};

type ScenarioCase =
  | {
      description: string;
      expected: { result: string };
      input: {
        boundaryKit: {
          config: BoundaryKitConfigDescriptor;
        };
      };
      shape: 'plain-config';
      name: string;
    }
  | {
      description: string;
      expected: { callCount: number; result: string };
      input: { boundaryKit: { failuresBeforeSuccess: number } };
      shape: 'default-retry';
      name: string;
    }
  | {
      description: string;
      expected: { acquireCount: number; attemptCount: number; successCount: number };
      input: {
        boundaryKit: {
          prebuiltConfig: Required<BoundaryKitConfigDescriptor>;
        };
      };
      shape: 'prebuilt-instances';
      name: string;
    }
  | {
      description: string;
      expected: { maxObservedActive: number };
      input: {
        batch: BatchInput;
        boundaryKit: {
          config: Required<Pick<BoundaryKitConfigDescriptor, 'throttle'>>;
          workDelayMs: number;
        };
      };
      shape: 'throttle-bound';
      name: string;
    }
  | {
      description: string;
      expected: { callCount: number; breakerStateAfterFirst: 'closed'; breakerStateAfterSecond: 'open'; rejectionName: string };
      input: {
        boundaryKit: {
          config: Required<Pick<BoundaryKitConfigDescriptor, 'circuitBreaker' | 'retry'>>;
        };
      };
      shape: 'circuit-breaker-open';
      name: string;
    }
  | {
      description: string;
      expected: { abortedRan: false; resultIsUndefined: true };
      input: {
        boundaryKit: {
          abortDelayMs: number;
          abortConfig: Required<Pick<BoundaryKitConfigDescriptor, 'throttle'>>;
        };
      };
      shape: 'undefined-result-vs-abort';
      name: string;
    };

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

  constructor(options: CircuitBreakerOptionsInterface) {
    super(options);
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

const retryClassifierMap: Record<
  RetryClassifierDescriptor['shape'],
  (descriptor: RetryClassifierDescriptor) => NonNullable<RetryConfigInterface['errorClassifier']>
> = {
  constant: (descriptor) => () => ({ reason: descriptor.reason, retryable: descriptor.retryable })
};

function materializeRetryConfig(config: RetryConfigDescriptor): RetryConfigInterface {
  const { errorClassifier, ...serializableConfig } = config;

  return {
    ...serializableConfig,
    ...(errorClassifier === undefined ? {} : { errorClassifier: retryClassifierMap[errorClassifier.shape](errorClassifier) })
  };
}

function materializeBoundaryKitConfig(
  descriptor: BoundaryKitConfigDescriptor,
  runtimeDeps: BoundaryKitRuntimeDeps = {}
): BoundaryKitConfigInterface {
  const circuitBreaker = runtimeDeps.circuitBreaker ?? descriptor.circuitBreaker;
  const retry = runtimeDeps.retry ?? (descriptor.retry === undefined ? undefined : materializeRetryConfig(descriptor.retry));
  const throttle = runtimeDeps.throttle ?? descriptor.throttle;

  return {
    ...(circuitBreaker === undefined ? {} : { circuitBreaker }),
    ...(retry === undefined ? {} : { retry }),
    ...(throttle === undefined ? {} : { throttle })
  };
}

function materializePrebuiltBoundaryKit(
  descriptor: Required<BoundaryKitConfigDescriptor>
): {
  circuitBreaker: SubclassedCircuitBreaker;
  config: BoundaryKitConfigInterface;
  retry: SubclassedRetry;
  throttle: SubclassedThrottle;
} {
  const throttle = new SubclassedThrottle(descriptor.throttle);
  const circuitBreaker = new SubclassedCircuitBreaker(descriptor.circuitBreaker);
  const retry = new SubclassedRetry(materializeRetryConfig(descriptor.retry));

  return {
    circuitBreaker,
    config: materializeBoundaryKitConfig(descriptor, { circuitBreaker, retry, throttle }),
    retry,
    throttle
  };
}

function materializeTrackedCircuitBreakerKit(
  descriptor: Required<Pick<BoundaryKitConfigDescriptor, 'circuitBreaker' | 'retry'>>
): { circuitBreaker: CircuitBreaker; kit: BoundaryKit } {
  const circuitBreaker = CircuitBreaker.create(descriptor.circuitBreaker);

  return {
    circuitBreaker,
    kit: BoundaryKit.create(materializeBoundaryKitConfig(descriptor, { circuitBreaker }))
  };
}

function materializeAbortBoundaryKit(
  descriptor: Required<Pick<BoundaryKitConfigDescriptor, 'throttle'>>
): { kit: BoundaryKit; throttle: Throttle } {
  const throttle = Throttle.create(descriptor.throttle);

  return {
    kit: BoundaryKit.create(materializeBoundaryKitConfig(descriptor, { throttle })),
    throttle
  };
}

function createExecuteBatch<T>(batch: BatchInput, execute: () => Promise<T>): Promise<T>[] {
  return Array.from({ length: batch.callCount }, () => execute());
}

type ScenarioRunner<K extends ScenarioCase['shape']> = (scenarioCase: Extract<ScenarioCase, { shape: K }>) => Promise<void>;
type RunnerMap = {
  [K in ScenarioCase['shape']]: ScenarioRunner<K>;
};

const runnerMap: RunnerMap = {
  'plain-config': async (scenarioCase) => {
    const kit = BoundaryKit.create(materializeBoundaryKitConfig(scenarioCase.input.boundaryKit.config));

    const result = await kit.execute(async () => scenarioCase.expected.result);
    assert.equal(result, scenarioCase.expected.result);
  },

  'default-retry': async (scenarioCase) => {
    const kit = BoundaryKit.create();
    let callCount = 0;

    const flaky = async (): Promise<string> => {
      callCount += 1;

      if (callCount <= scenarioCase.input.boundaryKit.failuresBeforeSuccess) {
        throw new Error('transient failure');
      }

      return scenarioCase.expected.result;
    };

    const result = await kit.execute(flaky);
    assert.equal(result, scenarioCase.expected.result);
    assert.equal(callCount, scenarioCase.expected.callCount);
  },

  'prebuilt-instances': async (scenarioCase) => {
    const { circuitBreaker, config, retry, throttle } = materializePrebuiltBoundaryKit(scenarioCase.input.boundaryKit.prebuiltConfig);
    const kit = BoundaryKit.create(config);

    await kit.execute(async () => 'ok');

    assert.equal(throttle.acquireCount, scenarioCase.expected.acquireCount);
    assert.equal(circuitBreaker.successCount, scenarioCase.expected.successCount);
    assert.equal(retry.attemptCount, scenarioCase.expected.attemptCount);
  },

  'throttle-bound': async (scenarioCase) => {
    const concurrencyLimit = scenarioCase.input.boundaryKit.config.throttle.concurrencyLimit;
    const kit = BoundaryKit.create(materializeBoundaryKitConfig(scenarioCase.input.boundaryKit.config));

    let active = 0;
    let maxObservedActive = 0;

    const trackedWork = async (): Promise<number> => {
      active += 1;
      maxObservedActive = Math.max(maxObservedActive, active);

      await new Promise((resolve) => { setTimeout(resolve, scenarioCase.input.boundaryKit.workDelayMs); });

      active -= 1;
      return active;
    };

    const calls = createExecuteBatch(scenarioCase.input.batch, () => kit.execute(trackedWork));
    await Promise.all(calls);

    assert.equal(maxObservedActive, scenarioCase.expected.maxObservedActive);
    assert.equal(maxObservedActive, concurrencyLimit);
  },

  'circuit-breaker-open': async (scenarioCase) => {
    const { circuitBreaker, kit } = materializeTrackedCircuitBreakerKit(scenarioCase.input.boundaryKit.config);

    let callCount = 0;

    const alwaysFails = async (): Promise<never> => {
      callCount += 1;
      throw new Error('always fails');
    };

    await assert.rejects(() => kit.execute(alwaysFails), MaximumRetriesExceededError);
    assert.equal(callCount, scenarioCase.expected.callCount);
    assert.equal(circuitBreaker.state, scenarioCase.expected.breakerStateAfterFirst);

    await assert.rejects(() => kit.execute(alwaysFails), MaximumRetriesExceededError);
    assert.equal(callCount, scenarioCase.expected.callCount * 2);
    assert.equal(circuitBreaker.state, scenarioCase.expected.breakerStateAfterSecond);

    await assert.rejects(() => kit.execute(alwaysFails), (error) => {
      assert.ok(error instanceof CircuitBreakerOpenError);
      assert.equal(error.constructor.name, scenarioCase.expected.rejectionName);
      return true;
    });
    assert.equal(callCount, scenarioCase.expected.callCount * 2);
  },

  'undefined-result-vs-abort': async (scenarioCase) => {
    const kit = BoundaryKit.create();

    let ran = false;
    const voidWork = async (): Promise<void> => {
      ran = true;
    };

    const result = await kit.execute(voidWork);
    assert.equal(result, undefined);
    assert.equal(ran, true);

    const { kit: abortKit, throttle } = materializeAbortBoundaryKit(scenarioCase.input.boundaryKit.abortConfig);

    let abortedRan = false;
    const blockingWork = async (): Promise<string> => {
      await new Promise((resolve) => { setTimeout(resolve, scenarioCase.input.boundaryKit.abortDelayMs); });
      return 'done';
    };
    const queuedWork = async (): Promise<void> => {
      abortedRan = true;
    };

    const first = abortKit.execute(blockingWork);
    const queued = abortKit.execute(queuedWork);

    await throttle.abort();

    await first.catch(() => {});
    await assert.rejects(() => queued, BoundaryKitAbortedError);
    assert.equal(abortedRan, scenarioCase.expected.abortedRan);
  }
};

async function runCase<K extends ScenarioCase['shape']>(scenarioCase: Extract<ScenarioCase, { shape: K }>): Promise<void> {
  await runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('BoundaryKit', () => {
  for (const scenarioCase of scenarioGroups.cases as ScenarioCase[]) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});
