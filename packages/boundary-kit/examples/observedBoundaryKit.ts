/** observedBoundaryKit — default construction, then direct composition of subclassed primitives. Run: npx tsx examples/observedBoundaryKit.ts */

// #region usage
import type { CircuitBreakerOptionsInterface } from '@studnicky/resilience';
import type { RetryConfigInterface, RetryContextType } from '@studnicky/retry';
import type { ThrottleConfigEntity } from '@studnicky/throttle';

import { CircuitBreaker } from '@studnicky/resilience';
import { Retry } from '@studnicky/retry';
import { Throttle } from '@studnicky/throttle';
import assert from 'node:assert/strict';

import { BoundaryKit } from '../src/index.js';

/**
 * Advanced usage: BoundaryKit has no hooks of its own — observability is delegated
 * entirely to the composed primitives. Subclass Throttle/CircuitBreaker/Retry directly
 * and pass the pre-built instances in; their own hooks keep firing exactly as they
 * would standalone, and the kit's getters return those exact subclass instances back.
 */
class TelemetryThrottle extends Throttle {
  readonly acquisitions: number[] = [];

  constructor(config?: Partial<ThrottleConfigEntity.Type>) {
    super(config);
  }

  protected override onAcquire(activeCount: number, queuedCount: number): void {
    console.log(`[throttle] slot acquired (active=${String(activeCount)}, queued=${String(queuedCount)})`);
    this.acquisitions.push(activeCount);
  }
}

class TelemetryCircuitBreaker extends CircuitBreaker {
  readonly rejections: number[] = [];

  constructor(options: CircuitBreakerOptionsInterface) {
    super(options);
  }

  protected override onReject(): void {
    console.log('[circuitBreaker] rejected — circuit is open');
    this.rejections.push(Date.now());
  }
}

class TelemetryRetry extends Retry {
  readonly scheduledRetries: number[] = [];

  constructor(config?: Partial<RetryConfigInterface>) {
    super(config ?? {});
  }

  protected override onRetryScheduled(context: RetryContextType): void {
    console.log(`[retry] attempt ${String(context.attemptNumber)} scheduled retry`);
    this.scheduledRetries.push(context.attemptNumber);
  }
}

class ObservedBoundaryKitExample {
  static async run(): Promise<void> {
    /**
     * Default construction: BoundaryKit.create() with no config resolves every composed
     * primitive to sensible defaults — including CircuitBreaker, which has no zero-arg
     * default of its own.
     */
    const defaultKit = BoundaryKit.create();

    let defaultAttempts = 0;

    const defaultResult = await defaultKit.execute(() => {
      defaultAttempts += 1;

      if (defaultAttempts < 2) {
        throw new Error('transient failure');
      }

      return 'default-ok';
    });

    console.log('Default kit result:', defaultResult, `(${String(defaultAttempts)} attempts)`);

    const throttle = new TelemetryThrottle({ 'concurrencyLimit': 3 });
    const circuitBreaker = new TelemetryCircuitBreaker({ 'failureThreshold': 2, 'resetTimeoutMs': 5000 });
    const retry = new TelemetryRetry({ 'maxRetries': 2 });

    const observedKit = BoundaryKit.create({
      'circuitBreaker': circuitBreaker,
      'retry': retry,
      'throttle': throttle
    });

    let flakyAttempts = 0;

    const observedResult = await observedKit.execute(() => {
      flakyAttempts += 1;

      if (flakyAttempts < 2) {
        throw new Error('transient failure');
      }

      return 'observed-ok';
    });

    console.log('Observed kit result:', observedResult);
    console.log('Throttle acquisitions:', throttle.acquisitions);
    console.log('Retry scheduled attempts:', retry.scheduledRetries);
    // #endregion usage

    assert.equal(defaultResult, 'default-ok');
    assert.equal(defaultAttempts, 2);

    assert.equal(observedResult, 'observed-ok');
    assert.equal(flakyAttempts, 2);
    assert.deepEqual(retry.scheduledRetries, [0]);
    assert.deepEqual(throttle.acquisitions, [1]);
    assert.equal(circuitBreaker.rejections.length, 0);

    // The kit's getters return the exact pre-built subclassed instances passed in.
    assert.equal(observedKit.getThrottle(), throttle);
    assert.equal(observedKit.getCircuitBreaker(), circuitBreaker);
    assert.equal(observedKit.getRetry(), retry);

    console.log('observedBoundaryKit: all assertions passed');
  }
}

await ObservedBoundaryKitExample.run();
