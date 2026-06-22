/**
 * Custom ClockProviderType — implement the two-method interface to inject
 * any time source into Clock. Swapping the provider changes what Clock returns.
 *
 * Run: npx tsx packages/clock/examples/custom-provider.ts
 */
import assert from 'node:assert/strict';

import type { ClockProviderType } from '../src/index.js';
import { Clock } from '../src/index.js';

// --- Custom provider with fixed values ---

class FixedClockProvider implements ClockProviderType {
  readonly #epochMs: number;
  readonly #ns: bigint;

  public constructor(epochMs: number, ns: bigint) {
    this.#epochMs = epochMs;
    this.#ns = ns;
  }

  public hrtime(): bigint {
    return this.#ns;
  }

  public now(): number {
    return this.#epochMs;
  }
}

const fixedProvider = new FixedClockProvider(9999, 9_999_000_000n);
const clockFixed = new Clock(fixedProvider);

assert.equal(clockFixed.now(), 9999, 'now() returns the fixed epoch-ms');
assert.equal(clockFixed.hrtime(), 9_999_000_000n, 'hrtime() returns the fixed nanoseconds');

console.log(`FixedClockProvider: now()=${clockFixed.now()}, hrtime()=${clockFixed.hrtime()}n`);

// --- Swapping provider changes what Clock returns ---

class CountingClockProvider implements ClockProviderType {
  #callCount: number;

  public constructor() {
    this.#callCount = 0;
  }

  public hrtime(): bigint {
    this.#callCount += 1;
    return BigInt(this.#callCount) * 1_000_000n;
  }

  public now(): number {
    this.#callCount += 1;
    return this.#callCount;
  }

  public get callCount(): number {
    return this.#callCount;
  }
}

const countingProvider = new CountingClockProvider();
const clockCounting = new Clock(countingProvider);

const firstNow = clockCounting.now();
const secondNow = clockCounting.now();

assert.ok(secondNow >= firstNow, 'monotonicity holds across counting provider calls');
console.log(`CountingClockProvider: firstNow=${firstNow}, secondNow=${secondNow}`);

// --- DI seam: same Clock constructor, different behavior per provider ---

const clockA = new Clock(new FixedClockProvider(1, 1_000_000n));
const clockB = new Clock(new FixedClockProvider(2, 2_000_000n));

assert.equal(clockA.now(), 1);
assert.equal(clockB.now(), 2);
console.log(`DI swap: clockA.now()=${clockA.now()}, clockB.now()=${clockB.now()}`);

console.log('custom-provider: all assertions passed');
