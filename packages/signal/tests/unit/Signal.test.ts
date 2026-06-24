/**
 * Signal Unit Tests
 *
 * Tests AbortSignal composition:
 * - never() singleton sentinel
 * - compose() with various option combinations
 * - timeout() thin wrapper
 */

import assert from 'node:assert/strict';
import { it } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { Signal } from '../../src/Signal.js';

const neverScenarios: Array<{ description: string; exec: () => void }> = [
  {
    description: 'never aborts',
    exec: () => {
      const sig = Signal.never();
      assert.ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
      assert.equal(sig.aborted, false, 'Should not be aborted');
    },
  },
  {
    description: 'same cached instance',
    exec: () => {
      const first  = Signal.never();
      const second = Signal.never();
      assert.equal(first, second, 'Should return the same cached instance');
    },
  },
];

for (const { description, exec } of neverScenarios) {
  it(description, exec);
}

const composeSyncScenarios: Array<{ description: string; exec: () => void }> = [
  {
    description: 'empty options',
    exec: () => {
      const sig = Signal.compose({});
      assert.ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
      assert.equal(sig.aborted, false, 'Should not be aborted');
    },
  },
  {
    description: 'provided signal',
    exec: () => {
      const controller = new AbortController();
      const sig = Signal.compose({ signal: controller.signal });
      assert.equal(sig, controller.signal, 'Should return the exact provided signal');
    },
  },
  {
    description: 'signal+deadlineMs abort',
    exec: () => {
      const controller = new AbortController();
      const sig = Signal.compose({ signal: controller.signal, deadlineMs: 5000 });
      assert.ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
      assert.equal(sig.aborted, false, 'Should not be aborted yet');
      controller.abort();
      assert.equal(sig.aborted, true, 'Should be aborted when caller signal is aborted');
    },
  },
];

for (const { description, exec } of composeSyncScenarios) {
  it(description, exec);
}

const timeoutSyncScenarios: Array<{ description: string; exec: () => void }> = [
  {
    description: 'returns AbortSignal',
    exec: () => {
      const sig = Signal.timeout(5000);
      assert.ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
    },
  },
];

for (const { description, exec } of timeoutSyncScenarios) {
  it(description, exec);
}

// Timing-dependent — kept as flat it()
it('returns a signal that fires after ~deadlineMs', async () => {
  const sig = Signal.compose({ deadlineMs: 50 });
  assert.ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
  assert.equal(sig.aborted, false, 'Should not be aborted immediately');
  await delay(80);
  assert.equal(sig.aborted, true, 'Should be aborted after deadline');
});

it('returns an AbortSignal that fires after the given ms', async () => {
  const sig = Signal.timeout(50);
  assert.equal(sig.aborted, false, 'Should not be aborted immediately');
  await delay(80);
  assert.equal(sig.aborted, true, 'Should be aborted after timeout');
});
