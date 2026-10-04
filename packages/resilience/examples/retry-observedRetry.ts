/** observedRetry — subclass Retry for lifecycle telemetry while supplying classification explicitly. */

import type { ErrorClassificationEntity } from '@studnicky/errors/entities';

import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';

import type { RetryCallStateEntity } from '../src/retry/entities/RetryCallStateEntity.js';
import type { RetryConfigInterface, RetryContextInterface } from '../src/retry/interfaces/index.js';

import { MaximumRetriesExceededError, Retry } from '../src/retry/index.js';

class AlwaysRetryableClassifier {
  static classify(_error: Error): ErrorClassificationEntity.Type {
    return { 'reason': 'always retryable', 'retryable': true };
  }
}

class TelemetryRetry extends Retry {
  readonly scheduledEvents: { 'attemptNumber': number; 'delayMs': number }[] = [];
  readonly giveUpEvents: { 'attemptNumber': number; 'reason': string }[] = [];

  constructor(config: RetryConfigInterface) {
    super(config);
  }

  protected override onAttempt(attemptNumber: number): void {
    console.log(`[retry] attempt ${attemptNumber} starting`);
  }

  protected override onRetryableError(attemptNumber: number, error: Error, classification: ErrorClassificationEntity.Type): void {
    console.log(`[retry] attempt ${attemptNumber} retryable error: ${error.message} (${classification.reason ?? 'no reason'})`);
  }

  protected override onRetryScheduled(context: RetryContextInterface): void {
    console.log(`[retry] attempt ${context.attemptNumber} scheduled retry in ${context.delayMs}ms`);
    this.scheduledEvents.push({ 'attemptNumber': context.attemptNumber, 'delayMs': context.delayMs });
  }

  protected override onGiveUp(error: Error, attemptNumber: number, reason: 'aborted' | 'exhausted' | 'nonRetryable'): void {
    console.log(`[retry] give up after ${attemptNumber} attempts: ${reason} — ${error.message}`);
    this.giveUpEvents.push({ 'attemptNumber': attemptNumber, 'reason': reason });
  }

  protected override enterCall(to: RetryCallStateEntity.Type, from: RetryCallStateEntity.Type): void {
    console.log(`[retry] call FSM ${from.variant} → ${to.variant}`);
  }
}

const retryLimit = 2;
const retry = new TelemetryRetry({
  'errorClassifier': AlwaysRetryableClassifier.classify,
  'maximumRetries': retryLimit
});

// #region usage
try {
  await retry.execute(() => {
    throw RuntimeError.create('always fails');
  });
} catch (error) {
  assert.ok(error instanceof MaximumRetriesExceededError, 'Expected MaximumRetriesExceededError');
}

console.log('Scheduled events:', retry.scheduledEvents);
console.log('GiveUp events:', retry.giveUpEvents);
console.log('Stats:', retry.getStats());
// #endregion usage

assert.equal(retry.scheduledEvents.length, retryLimit);
assert.ok(retry.scheduledEvents.every((scheduledEvent) => {
  const result = scheduledEvent.delayMs === 0;
  return result;
}));
assert.equal(retry.giveUpEvents.length, 1);
assert.equal(retry.giveUpEvents[0]!.reason, 'exhausted');
assert.equal(retry.giveUpEvents[0]!.attemptNumber, retryLimit);
assert.equal(retry.getStats().totalRetries, retryLimit);
assert.equal(retry.getStats().failedRequests, 1);

console.log('observedRetry: all assertions passed');
