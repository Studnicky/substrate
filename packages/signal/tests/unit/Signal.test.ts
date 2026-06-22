/**
 * Signal Unit Tests
 *
 * Tests AbortSignal composition:
 * - never() singleton sentinel
 * - compose() with various option combinations
 * - timeout() thin wrapper
 */

import { ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

import { Signal } from '../../src/Signal.js';

void describe('Signal', () => {
  void describe('never()', () => {
    void it('returns an AbortSignal that never aborts', () => {
      const sig = Signal.never();
      ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
      strictEqual(sig.aborted, false, 'Should not be aborted');
    });

    void it('returns the same instance on repeated calls (cached)', () => {
      const first  = Signal.never();
      const second = Signal.never();
      strictEqual(first, second, 'Should return the same cached instance');
    });
  });

  void describe('compose()', () => {
    void it('returns an AbortSignal when called with empty options (never sentinel)', () => {
      const sig = Signal.compose({});
      ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
      strictEqual(sig.aborted, false, 'Should not be aborted');
    });

    void it('returns the provided signal when no deadline is given', () => {
      const controller = new AbortController();
      const sig = Signal.compose({ signal: controller.signal });
      strictEqual(sig, controller.signal, 'Should return the exact provided signal');
    });

    void it('returns a signal that fires after ~deadlineMs', async () => {
      const sig = Signal.compose({ deadlineMs: 50 });
      ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
      strictEqual(sig.aborted, false, 'Should not be aborted immediately');
      await delay(80);
      strictEqual(sig.aborted, true, 'Should be aborted after deadline');
    });

    void it('returns a composed signal when both signal and deadlineMs are given', () => {
      const controller = new AbortController();
      const sig = Signal.compose({ signal: controller.signal, deadlineMs: 5000 });
      ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
      strictEqual(sig.aborted, false, 'Should not be aborted yet');
      // Aborting the caller signal should abort the composed signal
      controller.abort();
      strictEqual(sig.aborted, true, 'Should be aborted when caller signal is aborted');
    });
  });

  void describe('timeout()', () => {
    void it('returns an AbortSignal', () => {
      const sig = Signal.timeout(5000);
      ok(sig instanceof AbortSignal, 'Should be an AbortSignal');
    });

    void it('returns an AbortSignal that fires after the given ms', async () => {
      const sig = Signal.timeout(50);
      strictEqual(sig.aborted, false, 'Should not be aborted immediately');
      await delay(80);
      strictEqual(sig.aborted, true, 'Should be aborted after timeout');
    });
  });
});
