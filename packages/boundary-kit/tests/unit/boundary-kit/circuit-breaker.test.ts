/**
 * Proves the composition order (circuitBreaker wraps retry): once the circuit trips
 * open, subsequent BoundaryKit#execute() calls fail fast WITHOUT the retry loop
 * running any additional attempts against the wrapped fn.
 */

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { CircuitBreaker, CircuitBreakerOpenError } from '@studnicky/resilience';
import { MaxRetriesExceededError } from '@studnicky/retry';

import { BoundaryKit } from '../../../src/index.js';

void it('fails fast without retrying once the circuit breaker trips open', async () => {
  const circuitBreaker = CircuitBreaker.create({ 'failureThreshold': 2, 'resetTimeoutMs': 60_000 });
  const kit = BoundaryKit.create({
    'circuitBreaker': circuitBreaker,
    'retry': {
      'errorClassifier': () => ({ 'reason': 'always retryable', 'retryable': true }),
      'maxRetries': 2
    }
  });

  let callCount = 0;

  const alwaysFails = async (): Promise<never> => {
    callCount += 1;
    throw new Error('always fails');
  };

  // First execute(): retry exhausts 3 attempts (maxRetries: 2 => attempts 0,1,2),
  // all fail, retry gives up and throws — circuitBreaker records failure #1.
  await assert.rejects(() => kit.execute(alwaysFails), MaxRetriesExceededError);
  assert.equal(callCount, 3);
  assert.equal(circuitBreaker.state, 'closed');

  // Second execute(): same 3 attempts — circuitBreaker records failure #2, trips open.
  await assert.rejects(() => kit.execute(alwaysFails), MaxRetriesExceededError);
  assert.equal(callCount, 6);
  assert.equal(circuitBreaker.state, 'open');

  // Third execute(): circuit is open. circuitBreaker.execute() rejects BEFORE calling
  // retry.execute(), so fn is never invoked again — callCount must stay at 6.
  await assert.rejects(() => kit.execute(alwaysFails), CircuitBreakerOpenError);
  assert.equal(callCount, 6, 'retry must not run any attempts while the circuit is open');
});
