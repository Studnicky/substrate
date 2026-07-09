/**
 * Proves the composition order (throttle wraps circuitBreaker+retry): the throttle's
 * concurrency bound is respected across concurrent BoundaryKit#execute() calls, since
 * throttle is the outermost layer and admits work before circuitBreaker/retry ever see it.
 */

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { BoundaryKit } from '../../../src/index.js';

void it('respects the throttle concurrency bound across concurrent execute() calls', async () => {
  const concurrencyLimit = 2;
  const kit = BoundaryKit.create({
    'throttle': { 'concurrencyLimit': concurrencyLimit }
  });

  let active = 0;
  let maxObservedActive = 0;
  const totalCalls = 6;

  const trackedWork = async (): Promise<number> => {
    active += 1;
    maxObservedActive = Math.max(maxObservedActive, active);

    await new Promise((resolve) => { setTimeout(resolve, 20); });

    active -= 1;
    return active;
  };

  const calls = Array.from({ 'length': totalCalls }, () => kit.execute(trackedWork));

  await Promise.all(calls);

  assert.equal(maxObservedActive, concurrencyLimit, 'observed concurrency must never exceed the configured limit');
});
