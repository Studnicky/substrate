/**
 * Getter identity tests — strict identity, not deep equality. Proves subclassed
 * pre-built instances passed into config are the exact instances returned by
 * the getters, not copies or wrappers.
 */

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
  public acquireCount = 0;

  constructor(config?: Partial<ThrottleConfigEntity.Type>) {
    super(config);
  }

  protected override onAcquire(): void {
    this.acquireCount += 1;
  }
}

class SubclassedCircuitBreaker extends CircuitBreaker {
  public tripCount = 0;

  constructor(options: CircuitBreakerOptionsInterface) {
    super(options);
  }

  protected override onTrip(): void {
    this.tripCount += 1;
  }
}

class SubclassedRetry extends Retry {
  public attemptCount = 0;

  constructor(config?: Partial<RetryConfigInterface>) {
    super(config ?? {});
  }

  protected override onAttempt(): void {
    this.attemptCount += 1;
  }
}

void it('getters return the exact instances passed into create()', () => {
  const throttle = Throttle.create();
  const circuitBreaker = CircuitBreaker.create({ 'failureThreshold': 3, 'resetTimeoutMs': 1000 });
  const retry = Retry.create();

  const kit = BoundaryKit.create({
    'circuitBreaker': circuitBreaker,
    'retry': retry,
    'throttle': throttle
  });

  strictEqual(kit.getThrottle(), throttle);
  strictEqual(kit.getCircuitBreaker(), circuitBreaker);
  strictEqual(kit.getRetry(), retry);
});

void it('getters return the exact subclassed instances passed into create(), preserving subclass hooks', async () => {
  const throttle = new SubclassedThrottle({ 'concurrencyLimit': 5 });
  const circuitBreaker = new SubclassedCircuitBreaker({ 'failureThreshold': 5, 'resetTimeoutMs': 30_000 });
  const retry = new SubclassedRetry();

  const kit = BoundaryKit.create({
    'circuitBreaker': circuitBreaker,
    'retry': retry,
    'throttle': throttle
  });

  strictEqual(kit.getThrottle(), throttle);
  strictEqual(kit.getCircuitBreaker(), circuitBreaker);
  strictEqual(kit.getRetry(), retry);

  await kit.execute(async () => 'ok');

  strictEqual((kit.getThrottle() as SubclassedThrottle).acquireCount, 1);
  strictEqual((kit.getRetry() as SubclassedRetry).attemptCount, 1);
});
