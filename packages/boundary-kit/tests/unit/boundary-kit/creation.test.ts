/**
 * Proves BoundaryKit.create() builds Throttle/CircuitBreaker/Retry from plain config
 * (not only from pre-built instances), and that BoundaryKitBuilder wires a kit
 * identically to create() while preserving instance identity.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CircuitBreaker } from '@studnicky/resilience';
import { Retry } from '@studnicky/retry';
import { Throttle } from '@studnicky/throttle';

import { BoundaryKit } from '../../../src/index.js';

void describe('BoundaryKit.create() with plain config', () => {
  void it('builds Throttle, CircuitBreaker, and Retry from plain config instead of pre-built instances', () => {
    const kit = BoundaryKit.create({
      'circuitBreaker': { 'failureThreshold': 3, 'resetTimeoutMs': 1000 },
      'retry': { 'maxRetries': 5 },
      'throttle': { 'concurrencyLimit': 4 }
    });

    assert.ok(kit.getThrottle() instanceof Throttle);
    assert.ok(kit.getCircuitBreaker() instanceof CircuitBreaker);
    assert.ok(kit.getRetry() instanceof Retry);
  });

  void it('resolves circuitBreaker against BoundaryKit defaults when omitted', () => {
    const kit = BoundaryKit.create();

    assert.ok(kit.getCircuitBreaker() instanceof CircuitBreaker);
    assert.equal(kit.getCircuitBreaker().state, 'closed');
  });
});

void describe('BoundaryKit.builder()', () => {
  void it('wires a BoundaryKit identically to create(), preserving instance identity', () => {
    const throttle = Throttle.create({ 'concurrencyLimit': 2 });
    const retry = Retry.create({ 'maxRetries': 1 });

    const kit = BoundaryKit.builder()
      .throttle(throttle)
      .retry(retry)
      .circuitBreaker({ 'failureThreshold': 2, 'resetTimeoutMs': 5000 })
      .build();

    assert.strictEqual(kit.getThrottle(), throttle);
    assert.strictEqual(kit.getRetry(), retry);
    assert.ok(kit.getCircuitBreaker() instanceof CircuitBreaker);
  });
});
