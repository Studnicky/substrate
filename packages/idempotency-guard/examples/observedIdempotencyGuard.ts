/** observedIdempotencyGuard — override onReplay/onCoalesce/onConflict/onExecute to collect telemetry. Run: npx tsx examples/observedIdempotencyGuard.ts */

import assert from 'node:assert/strict';

// #region usage
import { IdempotencyConflictError, IdempotencyGuard } from '../src/index.js';

class TelemetryIdempotencyGuard extends IdempotencyGuard {
  readonly events: string[] = [];

  static tracked(): TelemetryIdempotencyGuard {
    return new TelemetryIdempotencyGuard({ 'capacity': 1000, 'ttlMs': 60_000 });
  }

  protected override onReplay(key: string): void {
    console.log(`[idempotency-guard] replay key=${key}`);
    this.events.push(`replay:${key}`);
  }

  protected override onCoalesce(key: string): void {
    console.log(`[idempotency-guard] coalesce key=${key}`);
    this.events.push(`coalesce:${key}`);
  }

  protected override onConflict(key: string): void {
    console.log(`[idempotency-guard] conflict key=${key}`);
    this.events.push(`conflict:${key}`);
  }

  protected override onExecute(key: string): void {
    console.log(`[idempotency-guard] execute key=${key}`);
    this.events.push(`execute:${key}`);
  }
}

const guard = TelemetryIdempotencyGuard.tracked();

// New key -> onExecute, factory runs
const first = await guard.run('order-42', { 'amount': 500 }, () => {
  return { 'chargeId': 'ch_1' };
});

// Same key, same payload -> onReplay, factory does NOT run
const replayed = await guard.run('order-42', { 'amount': 500 }, () => {
  return { 'chargeId': 'ch_should_not_run' };
});

// Same key, DIFFERENT payload -> onConflict, then throws
try {
  await guard.run('order-42', { 'amount': 999 }, () => {
    return { 'chargeId': 'ch_should_not_run' };
  });
} catch (error) {
  if (error instanceof IdempotencyConflictError) {
    console.log(`[idempotency-guard] rejected reuse of key="${error.key}"`);
  } else {
    throw error;
  }
}

// Concurrent calls with the same (new) key share one execution via Coalesce
class Shared {
  static resolve: (value: string) => void = () => {};
}
const pending = new Promise<string>((resolve) => { Shared.resolve = resolve; });
let factoryCalls = 0;
class SharedFactory {
  static async create(): Promise<string> {
    factoryCalls += 1;
    return await pending;
  }
}

const callA = guard.run('order-99', { 'region': 'us' }, SharedFactory.create);
const callB = guard.run('order-99', { 'region': 'us' }, SharedFactory.create);
Shared.resolve('shared-result');
const [resultA, resultB] = await Promise.all([callA, callB]);

console.log('Events:', guard.events);
// #endregion usage

assert.equal(first.chargeId, 'ch_1');
assert.equal(replayed.chargeId, 'ch_1');
assert.equal(factoryCalls, 1);
assert.equal(resultA, 'shared-result');
assert.equal(resultB, 'shared-result');

assert.deepEqual(guard.events, [
  'execute:order-42',
  'replay:order-42',
  'conflict:order-42',
  'execute:order-99',
  'coalesce:order-99'
]);

// getCache()/getCoalesce() expose the exact composed instances (Layer
// Transparency Rule) — advanced consumers can subclass or introspect them
// directly without subclassing IdempotencyGuard.
assert.equal(guard.getCache().size, 2);
assert.equal(guard.getCoalesce().isInflight('order-99'), false);

console.log('observedIdempotencyGuard: all assertions passed');
