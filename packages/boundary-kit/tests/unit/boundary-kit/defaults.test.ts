/**
 * Default-construction tests — BoundaryKit.create() with no config
 */

import { equal, ok } from 'node:assert/strict';
import { it } from 'node:test';

import { CircuitBreaker } from '@studnicky/resilience';
import { Retry } from '@studnicky/retry';
import { Throttle } from '@studnicky/throttle';

import { BoundaryKit } from '../../../src/index.js';

void it('produces a working, callable instance with real default primitives against a flaky function', async () => {
  const kit = BoundaryKit.create();

  ok(kit.getThrottle() instanceof Throttle);
  ok(kit.getCircuitBreaker() instanceof CircuitBreaker);
  ok(kit.getRetry() instanceof Retry);

  let callCount = 0;

  const flaky = async (): Promise<string> => {
    callCount += 1;

    if (callCount <= 2) {
      throw new Error('transient failure');
    }

    return 'ok';
  };

  const result = await kit.execute(flaky);

  equal(result, 'ok');
  equal(callCount, 3);
  equal(kit.getCircuitBreaker().state, 'closed');
});
