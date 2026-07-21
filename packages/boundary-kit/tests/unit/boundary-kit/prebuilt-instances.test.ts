/** Proves pre-built subclass instances remain the active composed primitives. */

import { strictEqual } from 'node:assert/strict';
import { it } from 'node:test';

import type { CircuitBreakerOptionsInterface } from '@studnicky/resilience';
import { CircuitBreaker } from '@studnicky/resilience';
import type { RetryConfigInterface } from '@studnicky/retry';
import { Retry } from '@studnicky/retry';
import type { ThrottleConfigEntity } from '@studnicky/throttle';
import { Throttle } from '@studnicky/throttle';

import { BoundaryKit } from '../../../src/index.js';

class SubclassedThrottle extends Throttle {
  acquireCount = 0;

  constructor(config?: Partial<ThrottleConfigEntity.Type>) {
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

  constructor(config?: Partial<RetryConfigInterface>) {
    super(config ?? {});
  }

  protected override onAttempt(): void {
    this.attemptCount += 1;
  }
}

void it('uses pre-built subclass instances directly', async () => {
  const throttle = new SubclassedThrottle({ 'concurrencyLimit': 5 });
  const circuitBreaker = new SubclassedCircuitBreaker({ 'failureThreshold': 5, 'resetTimeoutMs': 30_000 });
  const retry = new SubclassedRetry();
  const kit = BoundaryKit.create({
    'circuitBreaker': circuitBreaker,
    'retry': retry,
    'throttle': throttle
  });

  await kit.execute(async () => 'ok');

  strictEqual(throttle.acquireCount, 1);
  strictEqual(circuitBreaker.successCount, 1);
  strictEqual(retry.attemptCount, 1);
});
