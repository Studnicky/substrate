/**
 * SampleBuffer Unit Tests
 *
 * Tests for the fixed-capacity circular buffer with percentile calculation
 */

import {
  ok, strictEqual
} from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { SampleBuffer } from '../../../src/sample-buffer/SampleBuffer.js';

void describe('SampleBuffer', () => {
  void describe('construction', () => {
    void it('creates buffer with specified capacity', () => {
      const buffer = new SampleBuffer(100);

      strictEqual(buffer.length, 0, 'Should start empty');
      strictEqual(buffer.isFull, false, 'Should not be full initially');
    });

    void it('creates buffer with small capacity', () => {
      const buffer = new SampleBuffer(10);

      strictEqual(buffer.length, 0, 'Should start empty');
    });
  });

  void describe('push()', () => {
    void it('adds samples and increments length', () => {
      const buffer = new SampleBuffer(10);

      buffer.push(100);
      strictEqual(buffer.length, 1, 'Length should be 1 after first push');

      buffer.push(200);
      strictEqual(buffer.length, 2, 'Length should be 2 after second push');

      buffer.push(300);
      strictEqual(buffer.length, 3, 'Length should be 3 after third push');
    });

    void it('overwrites oldest sample when full', () => {
      const buffer = new SampleBuffer(3);

      buffer.push(100);
      buffer.push(200);
      buffer.push(300);
      strictEqual(buffer.length, 3, 'Should be at capacity');
      strictEqual(buffer.isFull, true, 'Should be full');

      // Add fourth sample - should overwrite oldest (100)
      buffer.push(400);
      strictEqual(buffer.length, 3, 'Length should remain at capacity');

      // p0 should now be 200 (the new oldest)
      const p0 = buffer.percentile(0);

      strictEqual(p0, 200, 'Oldest should now be 200');
    });

    void it('maintains correct length when full', () => {
      const buffer = new SampleBuffer(5);

      for (let i = 0; i < 10; i++) {
        buffer.push(i * 10);
      }

      strictEqual(buffer.length, 5, 'Length should stay at capacity');
      strictEqual(buffer.isFull, true, 'Should be full');
    });

    void it('sets isFull to true when capacity reached', () => {
      const buffer = new SampleBuffer(3);

      buffer.push(1);
      strictEqual(buffer.isFull, false);

      buffer.push(2);
      strictEqual(buffer.isFull, false);

      buffer.push(3);
      strictEqual(buffer.isFull, true, 'Should be full at capacity');
    });
  });

  void describe('percentile()', () => {
    void it('returns undefined when buffer is empty', () => {
      const buffer = new SampleBuffer(10);

      const p50 = buffer.percentile(50);
      const p95 = buffer.percentile(95);
      const p0 = buffer.percentile(0);

      strictEqual(p50, undefined, 'p50 should be undefined');
      strictEqual(p95, undefined, 'p95 should be undefined');
      strictEqual(p0, undefined, 'p0 should be undefined');
    });

    void it('returns single value for p0 and p100 with one sample', () => {
      const buffer = new SampleBuffer(10);

      buffer.push(42);

      const p0 = buffer.percentile(0);
      const p50 = buffer.percentile(50);
      const p100 = buffer.percentile(100);

      strictEqual(p0, 42, 'p0 should return the value');
      strictEqual(p50, 42, 'p50 should return the value');
      strictEqual(p100, 42, 'p100 should return the value');
    });

    void it('calculates p50 correctly for even sample count', () => {
      const buffer = new SampleBuffer(10);

      // Add 10 samples: 10, 20, 30, 40, 50, 60, 70, 80, 90, 100
      for (let i = 1; i <= 10; i++) {
        buffer.push(i * 10);
      }

      // p50 with linear interpolation: rank = 0.5 * 9 = 4.5
      // Interpolate between index 4 (50) and index 5 (60)
      // 50 + 0.5 * (60 - 50) = 55
      const p50 = buffer.percentile(50);

      strictEqual(p50, 55, 'p50 should be 55');
    });

    void it('calculates p50 correctly for odd sample count', () => {
      const buffer = new SampleBuffer(10);

      // Add 9 samples: 10, 20, 30, 40, 50, 60, 70, 80, 90
      for (let i = 1; i <= 9; i++) {
        buffer.push(i * 10);
      }

      // p50 with linear interpolation: rank = 0.5 * 8 = 4
      // Index 4 = 50 (no interpolation needed)
      const p50 = buffer.percentile(50);

      strictEqual(p50, 50, 'p50 should be 50');
    });

    void it('calculates p95 correctly', () => {
      const buffer = new SampleBuffer(100);

      // Add 100 samples: 1, 2, 3, ..., 100
      for (let i = 1; i <= 100; i++) {
        buffer.push(i);
      }

      // p95: rank = 0.95 * 99 = 94.05
      // Interpolate between index 94 (95) and index 95 (96)
      // 95 + 0.05 * (96 - 95) = 95.05
      const p95 = buffer.percentile(95);

      ok(p95 !== undefined, 'p95 should be defined');
      ok(p95 >= 95 && p95 <= 96, `p95 should be between 95 and 96, got ${p95}`);
    });

    void it('calculates p99 correctly', () => {
      const buffer = new SampleBuffer(100);

      // Add 100 samples: 1, 2, 3, ..., 100
      for (let i = 1; i <= 100; i++) {
        buffer.push(i);
      }

      const p99 = buffer.percentile(99);

      ok(p99 !== undefined, 'p99 should be defined');
      ok(p99 >= 99 && p99 <= 100, `p99 should be between 99 and 100, got ${p99}`);
    });

    void it('handles duplicate values', () => {
      const buffer = new SampleBuffer(10);

      // Add same value 5 times
      for (let i = 0; i < 5; i++) {
        buffer.push(100);
      }

      const p0 = buffer.percentile(0);
      const p50 = buffer.percentile(50);
      const p100 = buffer.percentile(100);

      strictEqual(p0, 100);
      strictEqual(p50, 100);
      strictEqual(p100, 100);
    });

    void it('uses linear interpolation between ranks', () => {
      const buffer = new SampleBuffer(10);

      // Add 5 samples: 0, 25, 50, 75, 100
      buffer.push(0);
      buffer.push(25);
      buffer.push(50);
      buffer.push(75);
      buffer.push(100);

      // p25: rank = 0.25 * 4 = 1 -> index 1 = 25
      const p25 = buffer.percentile(25);

      strictEqual(p25, 25, 'p25 should be 25');

      // p75: rank = 0.75 * 4 = 3 -> index 3 = 75
      const p75 = buffer.percentile(75);

      strictEqual(p75, 75, 'p75 should be 75');

      // p10: rank = 0.1 * 4 = 0.4
      // Interpolate between index 0 (0) and index 1 (25)
      // 0 + 0.4 * (25 - 0) = 10
      const p10 = buffer.percentile(10);

      strictEqual(p10, 10, 'p10 should be 10');
    });

    void it('handles p0 edge case', () => {
      const buffer = new SampleBuffer(10);

      buffer.push(5);
      buffer.push(10);
      buffer.push(15);

      const p0 = buffer.percentile(0);

      strictEqual(p0, 5, 'p0 should be minimum value');
    });

    void it('handles p100 edge case', () => {
      const buffer = new SampleBuffer(10);

      buffer.push(5);
      buffer.push(10);
      buffer.push(15);

      const p100 = buffer.percentile(100);

      strictEqual(p100, 15, 'p100 should be maximum value');
    });

    void it('handles negative percentile as p0', () => {
      const buffer = new SampleBuffer(10);

      buffer.push(5);
      buffer.push(10);
      buffer.push(15);

      const pNegative = buffer.percentile(-10);

      strictEqual(pNegative, 5, 'Negative percentile should return minimum');
    });

    void it('handles percentile > 100 as p100', () => {
      const buffer = new SampleBuffer(10);

      buffer.push(5);
      buffer.push(10);
      buffer.push(15);

      const pOver = buffer.percentile(150);

      strictEqual(pOver, 15, 'Percentile > 100 should return maximum');
    });
  });

  void describe('clear()', () => {
    void it('resets buffer to empty state', () => {
      const buffer = new SampleBuffer(10);

      buffer.push(100);
      buffer.push(200);
      buffer.push(300);

      buffer.clear();

      const p50 = buffer.percentile(50);

      strictEqual(buffer.length, 0, 'Length should be 0 after clear');
      strictEqual(buffer.isFull, false, 'Should not be full after clear');
      strictEqual(p50, undefined, 'Percentile should be undefined');
    });

    void it('allows reuse after clear', () => {
      const buffer = new SampleBuffer(3);

      buffer.push(100);
      buffer.push(200);
      buffer.push(300);
      buffer.clear();

      buffer.push(10);
      buffer.push(20);

      const p50 = buffer.percentile(50);

      strictEqual(buffer.length, 2, 'Should track new samples');
      strictEqual(p50, 15, 'Should calculate percentile from new samples');
    });
  });

  void describe('cache invalidation', () => {
    void it('recalculates percentile after new push', () => {
      const buffer = new SampleBuffer(10);

      buffer.push(10);
      buffer.push(20);
      buffer.push(30);

      const p50Before = buffer.percentile(50);

      buffer.push(1000);

      const p50After = buffer.percentile(50);

      ok(p50After !== undefined && p50Before !== undefined, 'Percentiles should be defined');
      ok(p50After > p50Before, 'p50 should increase after adding high value');
    });
  });
});
