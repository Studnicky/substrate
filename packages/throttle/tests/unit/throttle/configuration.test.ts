/**
 * Throttle Configuration Unit Tests
 *
 * Tests for configuration validation and defaults
 */

import {
  doesNotThrow, strictEqual, throws
} from 'node:assert/strict';
import { it } from 'node:test';

import { ConfigurationError } from '@studnicky/config';
import { Throttle } from '../../../src/throttle/index.js';

// ── Defaults ─────────────────────────────────────────────────────────────────

void it('uses default configuration when no config provided', () => {
  const throttle = Throttle.create();
  const stats = throttle.getStats();

  strictEqual(stats.concurrencyLimit, 10, 'Should use default limit of 10');
});

void it('allows custom concurrencyLimit', () => {
  const throttle = Throttle.create({ concurrencyLimit: 5 });
  const stats = throttle.getStats();

  strictEqual(stats.concurrencyLimit, 5, 'Should use specified limit');
});

void it('uses default concurrencyLimit when not specified', () => {
  const throttle = Throttle.create({});
  const stats = throttle.getStats();

  strictEqual(stats.concurrencyLimit, 10, 'Should use default limit of 10');
});

// ── Constructor validation ────────────────────────────────────────────────────

const invalidConcurrencyScenarios: Array<{ description: string; value: number }> = [
  { description: 'zero', value: 0 },
  { description: 'negative', value: -1 },
  { description: 'non-integer', value: 1.5 },
  { description: 'NaN', value: Number.NaN },
];

for (const { description, value } of invalidConcurrencyScenarios) {
  void it(`throws ConfigurationError for ${description} concurrencyLimit`, () => {
    throws(() => Throttle.create({ concurrencyLimit: value }), ConfigurationError);
  });
}

void it('accepts valid configuration', () => {
  doesNotThrow(() => { Throttle.create({ concurrencyLimit: 5 }); });
  doesNotThrow(() => { Throttle.create(); });
});

// ── updateConfig validation ───────────────────────────────────────────────────

const invalidUpdateScenarios: Array<{ description: string; value: number }> = [
  { description: 'zero', value: 0 },
  { description: 'non-integer', value: 1.5 },
];

for (const { description, value } of invalidUpdateScenarios) {
  void it(`updateConfig throws ConfigurationError for ${description} concurrencyLimit`, () => {
    const throttle = Throttle.create();
    throws(() => throttle.updateConfig({ concurrencyLimit: value }), ConfigurationError);
  });
}

void it('accepts valid updates', () => {
  const throttle = Throttle.create();

  doesNotThrow(() => { throttle.updateConfig({ concurrencyLimit: 10 }); });
});

void it('allows partial config updates', () => {
  const throttle = Throttle.create({ concurrencyLimit: 5 });

  throttle.updateConfig({ concurrencyLimit: 10 });

  const stats = throttle.getStats();

  strictEqual(stats.concurrencyLimit, 10);
});
