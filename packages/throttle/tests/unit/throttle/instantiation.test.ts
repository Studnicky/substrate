/**
 * Throttle Instantiation Unit Tests
 *
 * Tests for creating Throttle instances via constructor, factory, and builder
 */

import {
  ok, strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';

import {
  Throttle, ThrottleBuilder
} from '../../../src/throttle/index.js';

/** Test fixtures for static factory method tests */
class ThrottleTestHelpers {
  public static async factoryResult(): Promise<string> {
    return 'factory-result';
  }

  public static async chainedResult(): Promise<string> {
    return 'chained-result';
  }

  public static async multiplyAsync(first: number, second: number): Promise<number> {
    return first * second;
  }
}

// ── Constructor ───────────────────────────────────────────────────────────────

void it('creates throttle with new Throttle()', () => {
  const throttle = new Throttle({ concurrencyLimit: 5 });
  const stats = throttle.getStats();

  ok(throttle instanceof Throttle, 'Should be instance of Throttle');
  strictEqual(stats.concurrencyLimit, 5, 'Should use provided config');
});

void it('creates throttle with no config', () => {
  const throttle = new Throttle();
  const stats = throttle.getStats();

  strictEqual(stats.concurrencyLimit, 10, 'Should use default limit');
});

// ── Static factory method ─────────────────────────────────────────────────────

void it('creates throttle with Throttle.create(config)', () => {
  const throttle = Throttle.create({ concurrencyLimit: 5 });
  const stats = throttle.getStats();

  ok(throttle instanceof Throttle, 'Should return Throttle instance');
  strictEqual(stats.concurrencyLimit, 5, 'Should use provided config');
});

void it('creates throttle with Throttle.create() and no config', () => {
  const throttle = Throttle.create();
  const stats = throttle.getStats();

  strictEqual(stats.concurrencyLimit, 10, 'Should use default limit');
});

void it('executes operation directly with Throttle.create().execute()', async () => {
  const result = await Throttle.create({ concurrencyLimit: 5 })
    .execute(ThrottleTestHelpers.factoryResult);

  strictEqual(result, 'factory-result', 'Should execute and return result');
});

void it('chains execute after create with config', async () => {
  const result = await Throttle.create({ concurrencyLimit: 3 }).execute(ThrottleTestHelpers.chainedResult);

  strictEqual(result, 'chained-result', 'Should chain execute after create');
});

void it('executes with function arguments via closure', async () => {
  const result = await Throttle.create({ concurrencyLimit: 5 })
    .execute(async () => {
      return ThrottleTestHelpers.multiplyAsync(3, 4);
    });

  strictEqual(result, 12, 'Should execute function with arguments via closure');
});

// ── Builder pattern ───────────────────────────────────────────────────────────

void it('creates throttle with default settings', () => {
  const throttle = new ThrottleBuilder().build();
  const stats = throttle.getStats();

  ok(throttle instanceof Throttle, 'Should return Throttle instance');
  strictEqual(stats.concurrencyLimit, 10, 'Should use default limit');
});

void it('builds with custom concurrency limit', () => {
  const throttle = new ThrottleBuilder()
    .withConcurrencyLimit(5)
    .build();

  const stats = throttle.getStats();

  strictEqual(stats.concurrencyLimit, 5, 'Should use configured limit');
});

void it('returns builder instance for chaining', () => {
  const builder = new ThrottleBuilder();
  const result = builder.withConcurrencyLimit(5);

  strictEqual(result, builder, 'withConcurrencyLimit should return this');
});

// ── Functional equivalence ────────────────────────────────────────────────────

void it('constructor, factory, and builder produce equivalent throttles', () => {
  const viaConstructor = new Throttle({ concurrencyLimit: 7 });
  const viaFactory = Throttle.create({ concurrencyLimit: 7 });
  const viaBuilder = new ThrottleBuilder()
    .withConcurrencyLimit(7)
    .build();

  const stats1 = viaConstructor.getStats();
  const stats2 = viaFactory.getStats();
  const stats3 = viaBuilder.getStats();

  strictEqual(stats1.concurrencyLimit, stats2.concurrencyLimit);
  strictEqual(stats1.concurrencyLimit, stats3.concurrencyLimit);
});
