/**
 * CircuitBreaker Unit Tests
 */

import { rejects, strictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { CircuitBreaker } from '../../src/CircuitBreaker.js';
import { CircuitBreakerOpenError } from '../../src/CircuitBreakerOpenError.js';
import { ResilienceConfigError } from '../../src/errors/ResilienceConfigError.js';

const succeed = async (): Promise<string> => 'ok';
const fail = async (): Promise<never> => { throw new Error('failure'); };

// Config validation scenarios
const invalidConfigs: Array<{ description: string; config: { failureThreshold: number; resetTimeoutMs: number } }> = [
  { description: 'throws ResilienceConfigError for failureThreshold < 1', config: { failureThreshold: 0, resetTimeoutMs: 100 } },
  { description: 'throws ResilienceConfigError for resetTimeoutMs < 0', config: { failureThreshold: 1, resetTimeoutMs: -1 } },
];

for (const { description, config } of invalidConfigs) {
  it(description, () => {
    throws(() => { new CircuitBreaker(config); }, ResilienceConfigError);
  });
}

it('starts in closed state', () => {
  const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 100 });
  strictEqual(cb.state, 'closed');
});

it('trips to open after failureThreshold failures', async () => {
  const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 100 });
  await rejects(() => cb.execute(fail));
  strictEqual(cb.state, 'closed');
  await rejects(() => cb.execute(fail));
  strictEqual(cb.state, 'open');
});

it('resets failure count on success in closed state', async () => {
  const cb = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 100 });
  await rejects(() => cb.execute(fail));
  await rejects(() => cb.execute(fail));
  await cb.execute(succeed); // success resets count
  await rejects(() => cb.execute(fail));
  await rejects(() => cb.execute(fail));
  strictEqual(cb.state, 'closed'); // still needs one more to trip
  await rejects(() => cb.execute(fail));
  strictEqual(cb.state, 'open');
});

it('throws CircuitBreakerOpenError when open', async () => {
  const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 10_000 });
  await rejects(() => cb.execute(fail));
  strictEqual(cb.state, 'open');
  await rejects(
    () => cb.execute(succeed),
    (err: unknown) => err instanceof CircuitBreakerOpenError
  );
});

it('CircuitBreakerOpenError includes name in message', async () => {
  const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 10_000, name: 'my-cb' });
  await rejects(() => cb.execute(fail));
  await rejects(
    () => cb.execute(succeed),
    (err: unknown) => err instanceof CircuitBreakerOpenError && err.message.includes('my-cb')
  );
});

it('transitions to halfOpen after resetTimeoutMs', async () => {
  let time = 0;
  const clock = (): number => time;
  const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100, clock });

  await rejects(() => cb.execute(fail));
  strictEqual(cb.state, 'open');

  time = 100;
  await cb.execute(succeed);
  strictEqual(cb.state, 'closed');
});

it('stays open before resetTimeoutMs elapses', async () => {
  let time = 0;
  const clock = (): number => time;
  const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100, clock });

  await rejects(() => cb.execute(fail));
  strictEqual(cb.state, 'open');

  time = 99;
  await rejects(
    () => cb.execute(succeed),
    (err: unknown) => err instanceof CircuitBreakerOpenError
  );
  strictEqual(cb.state, 'open');
});

it('returns to closed after successThreshold successes in halfOpen', async () => {
  let time = 0;
  const clock = (): number => time;
  const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100, successThreshold: 2, clock });

  await rejects(() => cb.execute(fail));
  time = 100;

  await cb.execute(succeed);
  strictEqual(cb.state, 'halfOpen'); // only 1 success so far
  await cb.execute(succeed);
  strictEqual(cb.state, 'closed');
});

it('failure in halfOpen re-opens the circuit', async () => {
  let time = 0;
  const clock = (): number => time;
  const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100, clock });

  await rejects(() => cb.execute(fail));
  time = 100;
  await rejects(() => cb.execute(fail)); // halfOpen → open
  strictEqual(cb.state, 'open');
});

// State control scenarios
const stateControlScenarios: Array<{
  description: string;
  setup: (cb: CircuitBreaker) => Promise<void>;
  action: (cb: CircuitBreaker) => void;
  expectedState: string;
}> = [
  {
    description: 'reset() returns to closed from open',
    setup: async (cb) => { await rejects(() => cb.execute(fail)); },
    action: (cb) => { cb.reset(); },
    expectedState: 'closed',
  },
  {
    description: 'forceClosed() closes from open',
    setup: async (cb) => { await rejects(() => cb.execute(fail)); },
    action: (cb) => { cb.forceClosed(); },
    expectedState: 'closed',
  },
  {
    description: 'forceOpen() opens from closed',
    setup: async () => { /* no setup needed */ },
    action: (cb) => { cb.forceOpen(); },
    expectedState: 'open',
  },
];

for (const { description, setup, action, expectedState } of stateControlScenarios) {
  it(description, async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100 });
    await setup(cb);
    action(cb);
    strictEqual(cb.state, expectedState);
  });
}

it('execute succeeds after reset', async () => {
  const cb = new CircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 100 });
  await rejects(() => cb.execute(fail));
  cb.reset();
  const result = await cb.execute(succeed);
  strictEqual(result, 'ok');
});
