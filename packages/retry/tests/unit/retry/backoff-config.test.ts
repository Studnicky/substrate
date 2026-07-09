/**
 * Config-based backoff unit tests for Retry.
 *
 * Covers the dual-path treatment of backoff, mirroring error classification:
 * a `backoffStrategy` config value drives the default `onRetryScheduled` body,
 * while a subclass override of `onRetryScheduled` fully replaces that default
 * (config-based backoff never runs for an overridden instance).
 */

import {
  deepStrictEqual,
  strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';

import type { RetryConfigInterface, RetryContextType } from '../../../src/interfaces/index.js';

import {
  BackoffStrategy,
  DefaultHttpErrorClassifier,
  Retry
} from '../../../src/retry/index.js';

const EXPONENTIAL_BASE_DELAY = 100;

/**
 * Subclass that records the delayMs computed by the default onRetryScheduled
 * body (by calling super), then zeroes it so the test does not actually wait.
 */
class RecordingRetry extends Retry {
  constructor(config?: Partial<RetryConfigInterface>) {
    super(config ?? {});
  }

  readonly recordedDelays: number[] = [];

  protected override async onRetryScheduled(context: RetryContextType): Promise<void> {
    await super.onRetryScheduled(context);
    this.recordedDelays.push(context.delayMs);
    context.delayMs = 0;
  }
}

/**
 * Subclass that fully overrides onRetryScheduled without calling super,
 * proving the config-based backoff path never runs when overridden.
 */
class OverridingRetry extends Retry {
  constructor(config?: Partial<RetryConfigInterface>) {
    super(config ?? {});
  }

  readonly overrideDelays: number[] = [];

  protected override onRetryScheduled(context: RetryContextType): void {
    context.delayMs = 0;
    this.overrideDelays.push(context.delayMs);
  }
}

// ---------------------------------------------------------------------------
// Config-based backoff drives context.delayMs
// ---------------------------------------------------------------------------

it('backoffStrategy config computes delayMs via BackoffStrategy.exponential across attempts', async () => {
  const retry = new RecordingRetry({
    'backoffStrategy': { 'baseDelayMs': EXPONENTIAL_BASE_DELAY, 'strategy': BackoffStrategy.exponential },
    'errorClassifier': DefaultHttpErrorClassifier.create(),
    'maxRetries': 2
  });

  let callCount = 0;

  await retry.execute(async () => {
    callCount++;
    if (callCount <= 2) {throw new Error('transient failure');}
    return 'recovered';
  });

  // BackoffStrategy.exponential(attempt, base) = base * 2 ** attempt
  deepStrictEqual(retry.recordedDelays, [
    EXPONENTIAL_BASE_DELAY * Math.pow(2, 0),
    EXPONENTIAL_BASE_DELAY * Math.pow(2, 1)
  ]);
});

// ---------------------------------------------------------------------------
// No backoffStrategy config leaves delayMs at 0 (unchanged default)
// ---------------------------------------------------------------------------

it('no backoffStrategy config leaves delayMs at 0', async () => {
  const retry = new RecordingRetry({
    'errorClassifier': DefaultHttpErrorClassifier.create(),
    'maxRetries': 2
  });

  let callCount = 0;

  await retry.execute(async () => {
    callCount++;
    if (callCount === 1) {throw new Error('transient failure');}
    return 'recovered';
  });

  deepStrictEqual(retry.recordedDelays, [0]);
});

// ---------------------------------------------------------------------------
// Subclass override of onRetryScheduled fully replaces the default body —
// the config-based backoff must never be invoked.
// ---------------------------------------------------------------------------

it('subclass overriding onRetryScheduled without super bypasses backoffStrategy config entirely', async () => {
  const retry = new OverridingRetry({
    'backoffStrategy': { 'baseDelayMs': EXPONENTIAL_BASE_DELAY, 'strategy': BackoffStrategy.exponential },
    'errorClassifier': DefaultHttpErrorClassifier.create(),
    'maxRetries': 2
  });

  let callCount = 0;

  await retry.execute(async () => {
    callCount++;
    if (callCount <= 2) {throw new Error('transient failure');}
    return 'recovered';
  });

  // Override always sets delayMs = 0, regardless of the exponential config supplied.
  deepStrictEqual(retry.overrideDelays, [0, 0]);
  strictEqual(retry.overrideDelays.every((delay) => delay === 0), true);
});
