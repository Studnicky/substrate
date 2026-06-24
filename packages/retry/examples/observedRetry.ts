/** observedRetry — override onRetryScheduled and onGiveUp to collect telemetry. Run: npx tsx examples/observedRetry.ts */

import assert from 'node:assert/strict';

// #region usage
import type { ErrorClassificationType, RetryConfigInterface } from '../src/index.js';

import { MaxRetriesExceededError, Retry } from '../src/index.js';

class TelemetryRetry extends Retry {
  constructor(config?: Partial<RetryConfigInterface>) {
    super(config ?? {});
  }

  readonly scheduledEvents: { 'attemptNumber': number; 'delayMs': number }[] = [];
  readonly giveUpEvents: { 'attemptNumber': number; 'reason': string }[] = [];

  protected override classifyError(_error: Error): ErrorClassificationType {
    return { 'reason': 'always retryable', 'retryable': true };
  }

  protected override onRetryScheduled(attemptNumber: number, delayMs: number): void {
    this.scheduledEvents.push({ 'attemptNumber': attemptNumber, 'delayMs': delayMs });
  }

  protected override onGiveUp(
    _error: Error,
    attemptNumber: number,
    reason: 'aborted' | 'exhausted' | 'nonRetryable'
  ): void {
    this.giveUpEvents.push({ 'attemptNumber': attemptNumber, 'reason': reason });
  }
}

const maxRetries = 2;
const retry = new TelemetryRetry({
  'maxRetries': maxRetries,
  'retryInterceptor': () => {return { 'delayMs': 0 };}
});

// Operation always fails — exercises scheduled and giveUp hooks
try {
  await retry.execute(() => {
    throw new Error('always fails');
  });
} catch (err) {
  assert.ok(err instanceof MaxRetriesExceededError, 'Expected MaxRetriesExceededError');
}

console.log('Scheduled events:', retry.scheduledEvents);
console.log('GiveUp events:', retry.giveUpEvents);
console.log('Stats:', retry.getStats());
// #endregion usage

// onRetryScheduled fires once per scheduled retry (maxRetries times)
assert.equal(retry.scheduledEvents.length, maxRetries);
assert.ok(retry.scheduledEvents.every((e) => {return e.delayMs === 0;}));

// onGiveUp fires once with reason 'exhausted'
assert.equal(retry.giveUpEvents.length, 1);
assert.equal(retry.giveUpEvents[0]!.reason, 'exhausted');
assert.equal(retry.giveUpEvents[0]!.attemptNumber, maxRetries);

assert.equal(retry.getStats().totalRetries, maxRetries);
assert.equal(retry.getStats().failedRequests, 1);

console.log('observedRetry: all assertions passed');
