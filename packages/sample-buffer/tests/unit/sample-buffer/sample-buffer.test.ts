/**
 * SampleBuffer Unit Tests
 *
 * Tests for the fixed-capacity circular buffer with percentile calculation
 */

import assert from 'node:assert/strict';
import { it } from 'node:test';

import { SampleBuffer } from '../../../src/sample-buffer/SampleBuffer.js';
import { SampleBufferError } from '../../../src/errors/SampleBufferError.js';

// ── Construction ─────────────────────────────────────────────────────────────

const constructionScenarios: Array<{
  description: string;
  capacity: number;
  expectedLength: number;
  expectedFull: boolean;
}> = [
  { description: 'creates buffer with large capacity, starts empty', capacity: 100, expectedLength: 0, expectedFull: false },
  { description: 'creates buffer with small capacity, starts empty', capacity: 10, expectedLength: 0, expectedFull: false },
];

for (const { description, capacity, expectedLength, expectedFull } of constructionScenarios) {
  it(description, () => {
    const buf = SampleBuffer.create({ capacity });
    assert.equal(buf.length, expectedLength);
    assert.equal(buf.isFull, expectedFull);
  });
}

// ── Capacity error validation ─────────────────────────────────────────────────

const capacityErrorScenarios: Array<{ description: string; input: number }> = [
  { description: 'rejects zero capacity', input: 0 },
  { description: 'rejects negative capacity', input: -1 },
  { description: 'rejects non-integer capacity', input: 1.5 },
];

for (const { description, input } of capacityErrorScenarios) {
  it(description, () => {
    assert.throws(() => SampleBuffer.create({ capacity: input }), (err: unknown) => err instanceof SampleBufferError);
  });
}

// ── isFull transitions ────────────────────────────────────────────────────────

const isFullScenarios: Array<{
  description: string;
  capacity: number;
  pushCount: number;
  expected: boolean;
}> = [
  { description: 'isFull is false after one push into capacity-3 buffer', capacity: 3, pushCount: 1, expected: false },
  { description: 'isFull is false after two pushes into capacity-3 buffer', capacity: 3, pushCount: 2, expected: false },
  { description: 'isFull is true after filling capacity-3 buffer', capacity: 3, pushCount: 3, expected: true },
];

for (const { description, capacity, pushCount, expected } of isFullScenarios) {
  it(description, () => {
    const buf = SampleBuffer.create({ capacity });
    for (let i = 0; i < pushCount; i++) buf.push(i + 1);
    assert.equal(buf.isFull, expected);
  });
}

// ── Percentile — exact expected value ─────────────────────────────────────────

const percentileScenarios: Array<{
  description: string;
  capacity: number;
  samples: number[];
  pct: number;
  expected: number | undefined;
}> = [
  { description: 'returns undefined for empty buffer at p50', capacity: 10, samples: [], pct: 50, expected: undefined },
  { description: 'returns undefined for empty buffer at p95', capacity: 10, samples: [], pct: 95, expected: undefined },
  { description: 'returns undefined for empty buffer at p0', capacity: 10, samples: [], pct: 0, expected: undefined },
  { description: 'returns single value at p0 with one sample', capacity: 10, samples: [42], pct: 0, expected: 42 },
  { description: 'returns single value at p50 with one sample', capacity: 10, samples: [42], pct: 50, expected: 42 },
  { description: 'returns single value at p100 with one sample', capacity: 10, samples: [42], pct: 100, expected: 42 },
  { description: 'calculates p50 for even sample count (linear interpolation)', capacity: 10, samples: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100], pct: 50, expected: 55 },
  { description: 'calculates p50 for odd sample count (exact rank)', capacity: 10, samples: [10, 20, 30, 40, 50, 60, 70, 80, 90], pct: 50, expected: 50 },
  { description: 'handles all duplicate values at p0', capacity: 10, samples: [100, 100, 100, 100, 100], pct: 0, expected: 100 },
  { description: 'handles all duplicate values at p50', capacity: 10, samples: [100, 100, 100, 100, 100], pct: 50, expected: 100 },
  { description: 'handles all duplicate values at p100', capacity: 10, samples: [100, 100, 100, 100, 100], pct: 100, expected: 100 },
  { description: 'p25 lands on exact rank with [0,25,50,75,100]', capacity: 10, samples: [0, 25, 50, 75, 100], pct: 25, expected: 25 },
  { description: 'p75 lands on exact rank with [0,25,50,75,100]', capacity: 10, samples: [0, 25, 50, 75, 100], pct: 75, expected: 75 },
  { description: 'p10 uses linear interpolation with [0,25,50,75,100]', capacity: 10, samples: [0, 25, 50, 75, 100], pct: 10, expected: 10 },
  { description: 'p0 returns minimum value', capacity: 10, samples: [5, 10, 15], pct: 0, expected: 5 },
  { description: 'p100 returns maximum value', capacity: 10, samples: [5, 10, 15], pct: 100, expected: 15 },
  { description: 'negative percentile treated as p0', capacity: 10, samples: [5, 10, 15], pct: -10, expected: 5 },
  { description: 'percentile > 100 treated as p100', capacity: 10, samples: [5, 10, 15], pct: 150, expected: 15 },
];

for (const { description, capacity, samples, pct, expected } of percentileScenarios) {
  it(description, () => {
    const buf = SampleBuffer.create({ capacity });
    for (const s of samples) buf.push(s);
    assert.equal(buf.percentile(pct), expected);
  });
}

// ── Percentile — range assertions (p95/p99 with 100 samples) ─────────────────

const percentileRangeScenarios: Array<{
  description: string;
  capacity: number;
  sampleCount: number;
  pct: number;
  min: number;
  max: number;
}> = [
  { description: 'p95 for 1..100 falls between 95 and 96', capacity: 100, sampleCount: 100, pct: 95, min: 95, max: 96 },
  { description: 'p99 for 1..100 falls between 99 and 100', capacity: 100, sampleCount: 100, pct: 99, min: 99, max: 100 },
];

for (const { description, capacity, sampleCount, pct, min, max } of percentileRangeScenarios) {
  it(description, () => {
    const buf = SampleBuffer.create({ capacity });
    for (let i = 1; i <= sampleCount; i++) buf.push(i);
    const v = buf.percentile(pct);
    assert.ok(v !== undefined, 'percentile should be defined');
    assert.ok(v >= min && v <= max, `expected ${v} to be between ${min} and ${max}`);
  });
}

// ── Stateful multi-step tests ─────────────────────────────────────────────────

it('adds samples and increments length after each push', () => {
  const buf = SampleBuffer.create({ capacity: 10 });
  buf.push(100);
  assert.equal(buf.length, 1);
  buf.push(200);
  assert.equal(buf.length, 2);
  buf.push(300);
  assert.equal(buf.length, 3);
});

it('overwrites oldest sample when full', () => {
  const buf = SampleBuffer.create({ capacity: 3 });
  buf.push(100);
  buf.push(200);
  buf.push(300);
  assert.equal(buf.length, 3);
  assert.equal(buf.isFull, true);
  buf.push(400);
  assert.equal(buf.length, 3);
  // p0 should now be 200 (100 was evicted)
  assert.equal(buf.percentile(0), 200);
});

it('maintains correct length when full after excess pushes', () => {
  const buf = SampleBuffer.create({ capacity: 5 });
  for (let i = 0; i < 10; i++) buf.push(i * 10);
  assert.equal(buf.length, 5);
  assert.equal(buf.isFull, true);
});

it('clear() resets buffer to empty state', () => {
  const buf = SampleBuffer.create({ capacity: 10 });
  buf.push(100);
  buf.push(200);
  buf.push(300);
  buf.clear();
  assert.equal(buf.length, 0);
  assert.equal(buf.isFull, false);
  assert.equal(buf.percentile(50), undefined);
});

it('allows reuse after clear()', () => {
  const buf = SampleBuffer.create({ capacity: 3 });
  buf.push(100);
  buf.push(200);
  buf.push(300);
  buf.clear();
  buf.push(10);
  buf.push(20);
  assert.equal(buf.length, 2);
  assert.equal(buf.percentile(50), 15);
});

it('recalculates percentile after new push (cache invalidation)', () => {
  const buf = SampleBuffer.create({ capacity: 10 });
  buf.push(10);
  buf.push(20);
  buf.push(30);
  const p50Before = buf.percentile(50);
  buf.push(1000);
  const p50After = buf.percentile(50);
  assert.ok(p50After !== undefined && p50Before !== undefined, 'percentiles should be defined');
  assert.ok(p50After > p50Before, 'p50 should increase after adding high value');
});
