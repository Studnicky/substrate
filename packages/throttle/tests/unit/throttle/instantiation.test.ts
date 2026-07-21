/**
 * Throttle Instantiation Unit Tests
 *
 * Tests for creating Throttle instances via the static factory
 */

import {
  ok, strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';

import { Throttle } from '../../../src/throttle/index.js';

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
