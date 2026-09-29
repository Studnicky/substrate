/** observedIdempotencyGuard — override onReplay/onCoalesce/onConflict/onExecute to collect telemetry. Run: npx tsx examples/observedIdempotencyGuard.ts */

import assert from 'node:assert/strict';

// #region usage
import { IdempotencyPayloadEntity } from '../src/entities/index.js';
import { IdempotencyConflictError, IdempotencyGuard } from '../src/index.js';

class OrderPlacementResult {
  constructor(readonly orderId: string) {}
}

class TelemetryIdempotencyGuard extends IdempotencyGuard<OrderPlacementResult> {
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
  static resolve: (value: OrderPlacementResult) => void = () => {};
}

class SharedFactory {
  static factoryCalls = 0;
  static pending: Promise<OrderPlacementResult> = new Promise<OrderPlacementResult>((resolve) => {
    Shared.resolve = resolve;
  });

  static async create(): Promise<OrderPlacementResult> {
    SharedFactory.factoryCalls += 1;
    return await SharedFactory.pending;
  }
}

class IdempotencyGuardDemo {
  static async run(): Promise<{
    readonly 'factoryCalls': number;
    readonly 'first': OrderPlacementResult;
    readonly 'guard': TelemetryIdempotencyGuard;
    readonly 'replayed': OrderPlacementResult;
    readonly 'resultA': OrderPlacementResult;
    readonly 'resultB': OrderPlacementResult;
  }> {
    const guard = TelemetryIdempotencyGuard.tracked();
    console.log('Northstar Books: guarding checkout submissions by idempotency key');

    // New key -> onExecute, factory runs
    const first = await guard.run('checkout-request-1001', IdempotencyPayloadEntity.create({ 'isbn': '978-0132350884', 'quantity': 2 }), () => {
      return new OrderPlacementResult('northstar-order-1001');
    });

    // Same key, same payload -> onReplay, factory does NOT run
    const replayed = await guard.run('checkout-request-1001', IdempotencyPayloadEntity.create({ 'isbn': '978-0132350884', 'quantity': 2 }), () => {
      return new OrderPlacementResult('ch_should_not_run');
    });

    // Same key, DIFFERENT payload -> onConflict, then throws
    try {
      await guard.run('checkout-request-1001', IdempotencyPayloadEntity.create({ 'isbn': '978-0132350884', 'quantity': 3 }), () => {
        return new OrderPlacementResult('ch_should_not_run');
      });
    } catch (error) {
      if (error instanceof IdempotencyConflictError) {
        console.log(`[idempotency-guard] rejected reuse of key="${error.key}"`);
      } else {
        throw error;
      }
    }

    // Concurrent calls with the same (new) key share one execution via Coalesce
    const callA = guard.run('checkout-request-1002', IdempotencyPayloadEntity.create({ 'isbn': '978-0201633610', 'quantity': 1 }), SharedFactory.create);
    const callB = guard.run('checkout-request-1002', IdempotencyPayloadEntity.create({ 'isbn': '978-0201633610', 'quantity': 1 }), SharedFactory.create);
    Shared.resolve(new OrderPlacementResult('northstar-order-1002'));
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

assert.equal(results.first.orderId, 'northstar-order-1001');
assert.equal(results.replayed.orderId, 'northstar-order-1001');
assert.equal(results.factoryCalls, 1);
assert.equal(results.resultA.orderId, 'northstar-order-1002');
assert.equal(results.resultB.orderId, 'northstar-order-1002');

assert.deepEqual(results.guard.events, [
  'execute:checkout-request-1001',
  'replay:checkout-request-1001',
  'conflict:checkout-request-1001',
  'execute:checkout-request-1002',
  'coalesce:checkout-request-1002'
]);

console.log('observedIdempotencyGuard: all assertions passed');
