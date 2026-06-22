/** observedRetry — override onRetryScheduled and onGiveUp to collect telemetry. Run: npx tsx examples/observedRetry.ts */

import assert from 'node:assert/strict';

import { MaxRetriesExceededError, Retry } from '../src/index.js';
import type { ErrorClassificationType } from '../src/index.js';

class TelemetryRetry extends Retry {
  readonly scheduledEvents: Array<{ attemptNumber: number; delayMs: number }> = [];
  readonly giveUpEvents: Array<{ attemptNumber: number; reason: string }> = [];

  protected override classifyError(_error: Error): ErrorClassificationType {
    return { retryable: true, reason: 'always retryable' };
  }

  protected override onRetryScheduled(attemptNumber: number, delayMs: number): void {
    this.scheduledEvents.push({ attemptNumber, delayMs });
  }

  protected override onGiveUp(
    _error: Error,
    attemptNumber: number,
    reason: 'aborted' | 'exhausted' | 'nonRetryable'
  ): void {
    this.giveUpEvents.push({ attemptNumber, reason });
  }
}

const maxRetries = 2;
const retry = new TelemetryRetry({
  maxRetries,
  retryInterceptor: () => ({ delayMs: 0 })
});

// Operation always fails — exercises scheduled and giveUp hooks
try {
  await retry.execute(async () => {
    throw new Error('always fails');
  });
} catch (err) {
  assert.ok(err instanceof MaxRetriesExceededError, 'Expected MaxRetriesExceededError');
}

console.log('Scheduled events:', retry.scheduledEvents);
console.log('GiveUp events:', retry.giveUpEvents);
console.log('Stats:', retry.getStats());

// onRetryScheduled fires once per scheduled retry (maxRetries times)
assert.equal(retry.scheduledEvents.length, maxRetries);
assert.ok(retry.scheduledEvents.every((e) => e.delayMs === 0));

// onGiveUp fires once with reason 'exhausted'
assert.equal(retry.giveUpEvents.length, 1);
assert.equal(retry.giveUpEvents[0]!.reason, 'exhausted');
assert.equal(retry.giveUpEvents[0]!.attemptNumber, maxRetries);

assert.equal(retry.getStats().totalRetries, maxRetries);
assert.equal(retry.getStats().failedRequests, 1);

console.log('observedRetry: all assertions passed');
