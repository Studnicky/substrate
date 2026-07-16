/** observedMemoize — override onMemoHit/onMemoMiss/onMemoCoalesced to collect telemetry. Run: npx tsx examples/observedMemoize.ts */

import assert from 'node:assert/strict';

// #region usage
import { Memoize } from '../src/index.js';

class TelemetryMemoize extends Memoize<[string], { 'chargeId': string }> {
  readonly events: string[] = [];

  static tracked(fn: (id: string) => Promise<{ 'chargeId': string }>): TelemetryMemoize {
    const keyFn = (id: string): string => {
      if (id.length === 0 || id.trim().length === 0) {
        throw new Error('Charge ID cannot be empty');
      }
      return `charge:${id}`;
    };
    const result = TelemetryMemoize.create(fn, {
      'capacity': 1000,
      'keyFn': keyFn,
      'ttlMs': 60_000
    }) as TelemetryMemoize;
    return result;
  }

  protected override onMemoHit(key: string): void {
    console.log(`[memoize] hit key=${key}`);
    this.events.push(`hit:${key}`);
  }

  protected override onMemoMiss(key: string): void {
    console.log(`[memoize] miss key=${key}`);
    this.events.push(`miss:${key}`);
  }

  protected override onMemoCoalesced(key: string): void {
    console.log(`[memoize] coalesced key=${key}`);
    this.events.push(`coalesced:${key}`);
  }
}

let fetchCalls = 0;

class Charge {
  static fetch(id: string): Promise<{ 'chargeId': string }> {
    fetchCalls += 1;
    return Promise.resolve({ 'chargeId': `ch_${id}` });
  }
}

// Concurrent calls with the same (new) key share one invocation via Coalesce
class SharedChargeResolver {
  private static resolveFn: (value: { 'chargeId': string }) => void = () => {};

  static capture(resolve: (value: { 'chargeId': string }) => void): void {
    SharedChargeResolver.resolveFn = resolve;
  }

  static resolve(value: { 'chargeId': string }): void {
    SharedChargeResolver.resolveFn(value);
  }
}

// Runs the full demo sequence and returns every value the assertions below need,
// so the module ends up with a single top-level binding rather than one per step.
class MemoizeDemoRunner {
  static async run(): Promise<{
    'first': { 'chargeId': string };
    'memo': TelemetryMemoize;
    'resultA': { 'chargeId': string };
    'resultB': { 'chargeId': string };
    'second': { 'chargeId': string };
    'sharedCalls': number;
    'sharedMemo': TelemetryMemoize;
    'third': { 'chargeId': string };
  }> {
    const memo = TelemetryMemoize.tracked(Charge.fetch);

    // New key -> onMemoMiss, fn runs
    const first = await memo.call('order-42');

    // Same key -> onMemoHit, fn does NOT run
    const second = await memo.call('order-42');

    // invalidate() forces the next matching call to re-invoke fn
    memo.invalidate('order-42');
    const third = await memo.call('order-42');

    const pending = new Promise<{ 'chargeId': string }>((resolve) => { SharedChargeResolver.capture(resolve); });
    let sharedCalls = 0;
    const sharedMemo = TelemetryMemoize.tracked(async () => {
      sharedCalls += 1;
      return await pending;
    });

    const callA = sharedMemo.call('order-99');
    const callB = sharedMemo.call('order-99');
    SharedChargeResolver.resolve({ 'chargeId': 'ch_shared' });
    const [resultA, resultB] = await Promise.all([callA, callB]);

    console.log('Events:', memo.events, sharedMemo.events);

    return { 'first': first, 'memo': memo, 'resultA': resultA, 'resultB': resultB, 'second': second, 'sharedCalls': sharedCalls, 'sharedMemo': sharedMemo, 'third': third };
  }
}

const demo = await MemoizeDemoRunner.run();
// #endregion usage

assert.equal(demo.first.chargeId, 'ch_order-42');
assert.equal(demo.second.chargeId, 'ch_order-42');
assert.equal(demo.third.chargeId, 'ch_order-42');
assert.equal(fetchCalls, 2);
assert.equal(demo.sharedCalls, 1);
assert.equal(demo.resultA.chargeId, 'ch_shared');
assert.equal(demo.resultB.chargeId, 'ch_shared');

assert.deepEqual(demo.memo.events, ['miss:charge:order-42', 'hit:charge:order-42', 'miss:charge:order-42']);
assert.deepEqual(demo.sharedMemo.events, ['miss:charge:order-99', 'coalesced:charge:order-99']);

// getCache()/getCoalesce() expose the exact composed instances (Layer
// Transparency Rule) — advanced consumers can subclass or introspect them
// directly without subclassing Memoize.
assert.equal(demo.memo.getCache().size, 1);
assert.equal(demo.sharedMemo.getCoalesce().isInflight('order-99'), false);

console.log('observedMemoize: all assertions passed');
