/**
 * Proves KeyedWorkGate.create() builds Mutex/Coalesce from plain config
 * (not only from pre-built instances), and that KeyedWorkGateBuilder wires
 * a gate identically to create() while preserving instance identity.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Coalesce } from '@studnicky/concurrency';
import { Mutex } from '@studnicky/mutex';

import { KeyedWorkGate } from '../../../src/index.js';

void describe('KeyedWorkGate.create() with plain config', () => {
  void it('builds Mutex and Coalesce from plain config instead of a pre-built instance', () => {
    const gate = KeyedWorkGate.create<string>({
      'coalesce': { 'timeout': 1000 },
      'mutex': { 'timeout': 5000 }
    });

    assert.ok(gate.getMutex() instanceof Mutex);
    assert.ok(gate.getCoalesce() instanceof Coalesce);
    assert.equal(gate.getMutex().getConfig().timeout, 5000);
  });
});

void describe('KeyedWorkGate.builder()', () => {
  void it('wires a KeyedWorkGate identically to create(), preserving instance identity', () => {
    const mutex = Mutex.create<string>({ 'timeout': 2000 });
    const coalesce = Coalesce.create<unknown>({ 'timeout': 500 });

    const gate = KeyedWorkGate.builder<string>()
      .mutex(mutex)
      .coalesce(coalesce)
      .build();

    assert.strictEqual(gate.getMutex(), mutex);
    assert.strictEqual(gate.getCoalesce(), coalesce);
  });
});
