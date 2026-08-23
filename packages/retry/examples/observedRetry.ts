/** observedRetry — override onRetryScheduled and onGiveUp to collect telemetry. Run: npx tsx examples/observedRetry.ts */

// #region usage
import type { ErrorClassificationEntity } from '@studnicky/errors';

import assert from 'node:assert/strict';

import type { RetryConfigInterface, RetryContextInterface } from '../src/index.js';

import { MaximumRetriesExceededError, Retry } from '../src/index.js';

class TelemetryRetry extends Retry {
  constructor(config?: RetryConfigInterface) {
    super(config ?? {});
  }

  readonly scheduledEvents: { 'attemptNumber': number; 'delayMs': number }[] = [];
  readonly giveUpEvents: { 'attemptNumber': number; 'reason': string }[] = [];

  protected override classifyError(_error: Error): ErrorClassificationEntity.Type {
    return { 'reason': 'always retryable', 'retryable': true };
  }

  protected override onAttempt(attemptNumber: number): void {
    console.log(`[retry] attempt ${attemptNumber} starting`);
  }

  protected override onRetryableError(
    attemptNumber: number,
    error: Error,
    classification: ErrorClassificationEntity.Type
  ): void {
    console.log(`[retry] attempt ${attemptNumber} retryable error: ${error.message} (${classification.reason ?? 'no reason'})`);
  }

  protected override onRetryScheduled(context: RetryContextInterface): void {
    console.log(`[retry] attempt ${context.attemptNumber} scheduled retry in ${context.delayMs}ms`);
    this.scheduledEvents.push({ 'attemptNumber': context.attemptNumber, 'delayMs': context.delayMs });
  }

  protected override onGiveUp(
    error: Error,
    attemptNumber: number,
    reason: 'aborted' | 'exhausted' | 'nonRetryable'
  ): void {
    console.log(`[retry] give up after ${attemptNumber} attempts: ${reason} — ${error.message}`);
    this.giveUpEvents.push({ 'attemptNumber': attemptNumber, 'reason': reason });
  }

  protected override enterCall(to: string, from: string): void {
    console.log(`[retry] call FSM ${from} → ${to}`);
  }
}

const retryLimit = 2;
const retry = new TelemetryRetry({
  'maximumRetries': retryLimit
});

// Operation always fails — exercises scheduled and giveUp hooks
try {
  await retry.execute(() => {
    throw new Error('always fails');
  });
} catch (error) {
  assert.ok(error instanceof MaximumRetriesExceededError, 'Expected MaximumRetriesExceededError');
}

console.log('Scheduled events:', retry.scheduledEvents);
console.log('GiveUp events:', retry.giveUpEvents);
console.log('Stats:', retry.getStats());
// #endregion usage

// onRetryScheduled fires once per scheduled retry (maximumRetries times)
assert.equal(retry.scheduledEvents.length, retryLimit);
assert.ok(retry.scheduledEvents.every((scheduledEvent) => {
  const result = scheduledEvent.delayMs === 0;
  return result;
}));

// onGiveUp fires once with reason 'exhausted'
assert.equal(retry.giveUpEvents.length, 1);
assert.equal(retry.giveUpEvents[0]!.reason, 'exhausted');
assert.equal(retry.giveUpEvents[0]!.attemptNumber, retryLimit);

assert.equal(retry.getStats().totalRetries, retryLimit);
assert.equal(retry.getStats().failedRequests, 1);

console.log('observedRetry: all assertions passed');
