/**
 * CircuitBreaker Unit Tests
 */

import { deepStrictEqual, ok, rejects, strictEqual, throws } from 'node:assert/strict';
import { it } from 'node:test';

import { CircuitBreaker } from '../../src/CircuitBreaker.js';
import { CircuitBreakerOpenError } from '../../src/CircuitBreakerOpenError.js';
import { ResilienceConfigError } from '../../src/errors/ResilienceConfigError.js';
import type { CircuitBreakerOptionsInterface } from '../../src/interfaces/CircuitBreakerOptionsInterface.js';

const succeed = async (): Promise<string> => 'ok';
const fail = async (): Promise<never> => { throw new Error('failure'); };

// Config validation scenarios
const invalidConfigs: Array<{ description: string; config: { failureThreshold: number; resetTimeoutMs: number } }> = [
  { description: 'throws ResilienceConfigError for failureThreshold < 1', config: { failureThreshold: 0, resetTimeoutMs: 100 } },
  { description: 'throws ResilienceConfigError for resetTimeoutMs < 0', config: { failureThreshold: 1, resetTimeoutMs: -1 } },
];

for (const { description, config } of invalidConfigs) {
  it(description, () => {
    throws(() => { CircuitBreaker.create(config); }, ResilienceConfigError);
  });
}

it('starts in closed state', () => {
  const cb = CircuitBreaker.create({ failureThreshold: 2, resetTimeoutMs: 100 });
  strictEqual(cb.state, 'closed');
});

it('trips to open after failureThreshold failures', async () => {
  const cb = CircuitBreaker.create({ failureThreshold: 2, resetTimeoutMs: 100 });
  await rejects(() => cb.execute(fail));
  strictEqual(cb.state, 'closed');
  await rejects(() => cb.execute(fail));
  strictEqual(cb.state, 'open');
});

it('resets failure count on success in closed state', async () => {
  const cb = CircuitBreaker.create({ failureThreshold: 3, resetTimeoutMs: 100 });
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
  const cb = CircuitBreaker.create({ failureThreshold: 1, resetTimeoutMs: 10_000 });
  await rejects(() => cb.execute(fail));
  strictEqual(cb.state, 'open');
  await rejects(
    () => cb.execute(succeed),
    (err: unknown) => err instanceof CircuitBreakerOpenError
  );
});

it('CircuitBreakerOpenError includes name in message', async () => {
  const cb = CircuitBreaker.create({ failureThreshold: 1, resetTimeoutMs: 10_000, name: 'my-cb' });
  await rejects(() => cb.execute(fail));
  await rejects(
    () => cb.execute(succeed),
    (err: unknown) => err instanceof CircuitBreakerOpenError && err.message.includes('my-cb')
  );
});

it('transitions to halfOpen after resetTimeoutMs', async () => {
  let time = 0;
  const clock = (): number => time;
  const cb = CircuitBreaker.create({ failureThreshold: 1, resetTimeoutMs: 100, clock });

  await rejects(() => cb.execute(fail));
  strictEqual(cb.state, 'open');

  time = 100;
  await cb.execute(succeed);
  strictEqual(cb.state, 'closed');
});

it('stays open before resetTimeoutMs elapses', async () => {
  let time = 0;
  const clock = (): number => time;
  const cb = CircuitBreaker.create({ failureThreshold: 1, resetTimeoutMs: 100, clock });

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
  const cb = CircuitBreaker.create({ failureThreshold: 1, resetTimeoutMs: 100, successThreshold: 2, clock });

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
  const cb = CircuitBreaker.create({ failureThreshold: 1, resetTimeoutMs: 100, clock });

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
    const cb = CircuitBreaker.create({ failureThreshold: 1, resetTimeoutMs: 100 });
    await setup(cb);
    action(cb);
    strictEqual(cb.state, expectedState);
  });
}

it('execute succeeds after reset', async () => {
  const cb = CircuitBreaker.create({ failureThreshold: 1, resetTimeoutMs: 100 });
  await rejects(() => cb.execute(fail));
  cb.reset();
  const result = await cb.execute(succeed);
  strictEqual(result, 'ok');
});

// --- Lifecycle hook tests ---

class ObservedBreaker extends CircuitBreaker {
  readonly events: string[] = [];
  constructor(options: CircuitBreakerOptionsInterface) { super(options); }
  protected override onSuccess(): void { this.events.push('success'); }
  protected override onFailure(_error: unknown): void { this.events.push('failure'); }
  protected override onTrip(): void { this.events.push('trip'); }
  protected override onOpen(): void { this.events.push('open'); }
  protected override onHalfOpen(): void { this.events.push('halfOpen'); }
  protected override onClose(): void { this.events.push('close'); }
  protected override onReject(): void { this.events.push('reject'); }
}

it('onSuccess fires on successful execute', async () => {
  const cb = new ObservedBreaker({ failureThreshold: 2, resetTimeoutMs: 100 });
  await cb.execute(succeed);
  deepStrictEqual(cb.events, ['success']);
});

it('onFailure fires on failed execute', async () => {
  const cb = new ObservedBreaker({ failureThreshold: 2, resetTimeoutMs: 100 });
  await rejects(() => cb.execute(fail));
  ok(cb.events.includes('failure'));
});

it('onTrip and onOpen fire when failure threshold reached', async () => {
  const cb = new ObservedBreaker({ failureThreshold: 2, resetTimeoutMs: 100 });
  await rejects(() => cb.execute(fail));
  await rejects(() => cb.execute(fail));
  const tripIdx = cb.events.indexOf('trip');
  const openIdx = cb.events.indexOf('open');
  ok(tripIdx !== -1, 'trip fired');
  ok(openIdx !== -1, 'open fired');
  ok(tripIdx < openIdx, 'trip fires before open');
});

it('onReject fires when circuit is open', async () => {
  const cb = new ObservedBreaker({ failureThreshold: 1, resetTimeoutMs: 10_000 });
  await rejects(() => cb.execute(fail));
  cb.events.length = 0; // clear prior events
  await rejects(() => cb.execute(succeed), (e: unknown) => e instanceof CircuitBreakerOpenError);
  ok(cb.events.includes('reject'));
});

it('onHalfOpen fires after resetTimeoutMs', async () => {
  let time = 0;
  const clock = (): number => time;
  const cb = new ObservedBreaker({ failureThreshold: 1, resetTimeoutMs: 100, clock });
  await rejects(() => cb.execute(fail));
  time = 100;
  await cb.execute(succeed);
  ok(cb.events.includes('halfOpen'));
});

it('onClose fires after halfOpen succeeds', async () => {
  let time = 0;
  const clock = (): number => time;
  const cb = new ObservedBreaker({ failureThreshold: 1, resetTimeoutMs: 100, clock });
  await rejects(() => cb.execute(fail));
  time = 100;
  await cb.execute(succeed);
  ok(cb.events.includes('close'));
});

it('onClose fires on reset()', async () => {
  const cb = new ObservedBreaker({ failureThreshold: 1, resetTimeoutMs: 100 });
  await rejects(() => cb.execute(fail));
  cb.events.length = 0;
  cb.reset();
  ok(cb.events.includes('close'));
});

it('onOpen fires on forceOpen()', () => {
  const cb = new ObservedBreaker({ failureThreshold: 2, resetTimeoutMs: 100 });
  cb.forceOpen();
  ok(cb.events.includes('open'));
});

it('onOpen fires when halfOpen failure re-opens, but NOT onTrip', async () => {
  let time = 0;
  const clock = (): number => time;
  const cb = new ObservedBreaker({ failureThreshold: 1, resetTimeoutMs: 100, clock });
  // trip closed→open
  await rejects(() => cb.execute(fail));
  cb.events.length = 0; // reset to observe only the re-open
  // advance to halfOpen, then fail
  time = 100;
  await rejects(() => cb.execute(fail));
  ok(cb.events.includes('open'), 'open fires on re-open');
  ok(!cb.events.includes('trip'), 'trip does NOT fire on re-open');
});
