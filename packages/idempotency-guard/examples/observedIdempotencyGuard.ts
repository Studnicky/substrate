/** observedIdempotencyGuard — override onReplay/onCoalesce/onConflict/onExecute to collect telemetry. Run: npx tsx examples/observedIdempotencyGuard.ts */

import assert from 'node:assert/strict';

// #region usage
import { IdempotencyConflictError, IdempotencyGuard } from '../src/index.js';

class ChargeResult {
  constructor(readonly chargeId: string) {}
}

class TelemetryIdempotencyGuard extends IdempotencyGuard<ChargeResult> {
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

class Shared {
  static resolve: (value: ChargeResult) => void = () => {};
}

class SharedFactory {
  static factoryCalls = 0;
  static pending: Promise<ChargeResult> = new Promise<ChargeResult>((resolve) => {
    Shared.resolve = resolve;
  });

  static async create(): Promise<ChargeResult> {
    SharedFactory.factoryCalls += 1;
    return await SharedFactory.pending;
  }
}

class IdempotencyGuardDemo {
  static async run(): Promise<{
    readonly 'factoryCalls': number;
    readonly 'first': ChargeResult;
    readonly 'guard': TelemetryIdempotencyGuard;
    readonly 'replayed': ChargeResult;
    readonly 'resultA': ChargeResult;
    readonly 'resultB': ChargeResult;
  }> {
    const guard = TelemetryIdempotencyGuard.tracked();

    // New key -> onExecute, factory runs
    const first = await guard.run('order-42', { 'amount': 500 }, () => {
      return new ChargeResult('ch_1');
    });

    // Same key, same payload -> onReplay, factory does NOT run
    const replayed = await guard.run('order-42', { 'amount': 500 }, () => {
      return new ChargeResult('ch_should_not_run');
    });

    // Same key, DIFFERENT payload -> onConflict, then throws
    try {
      await guard.run('order-42', { 'amount': 999 }, () => {
        return new ChargeResult('ch_should_not_run');
      });
    } catch (error) {
      if (error instanceof IdempotencyConflictError) {
        console.log(`[idempotency-guard] rejected reuse of key="${error.key}"`);
      } else {
        throw error;
      }
    }

    // Concurrent calls with the same (new) key share one execution via Coalesce
    const callA = guard.run('order-99', { 'region': 'us' }, SharedFactory.create);
    const callB = guard.run('order-99', { 'region': 'us' }, SharedFactory.create);
    Shared.resolve(new ChargeResult('shared-result'));
    const [resultA, resultB] = await Promise.all([callA, callB]);

    console.log('Events:', guard.events);

    return {
      'factoryCalls': SharedFactory.factoryCalls,
      'first': first,
      'guard': guard,
      'replayed': replayed,
      'resultA': resultA,
      'resultB': resultB
    };
  }
}

const results = await IdempotencyGuardDemo.run();
// #endregion usage

assert.equal(results.first.chargeId, 'ch_1');
assert.equal(results.replayed.chargeId, 'ch_1');
assert.equal(results.factoryCalls, 1);
assert.equal(results.resultA.chargeId, 'shared-result');
assert.equal(results.resultB.chargeId, 'shared-result');

assert.deepEqual(results.guard.events, [
  'execute:order-42',
  'replay:order-42',
  'conflict:order-42',
  'execute:order-99',
  'coalesce:order-99'
]);

console.log('observedIdempotencyGuard: all assertions passed');
