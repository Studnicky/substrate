/**
 * Delay Unit Tests
 *
 * Tests for Delay.for timeout/abort behavior and abort-listener cleanup.
 */

import {
  rejects, strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';

import { Delay } from '../../../src/throttle/Delay.js';

// ── Timeout resolution ────────────────────────────────────────────────────────

void it('resolves after the timeout elapses when no signal is provided', async () => {
  await Delay.for(1);
});

void it('resolves after the timeout elapses when the signal is never aborted', async () => {
  const controller = new AbortController();

  await Delay.for(1, controller.signal);
});

// ── Abort handling ─────────────────────────────────────────────────────────────

void it('rejects with AbortError when the signal is already aborted', async () => {
  const controller = new AbortController();
  controller.abort();

  await rejects(
    Delay.for(50, controller.signal),
    (error: unknown) => error instanceof DOMException && error.name === 'AbortError'
  );
});

void it('rejects with AbortError when the signal aborts before the timeout', async () => {
  const controller = new AbortController();
  const promise = Delay.for(50, controller.signal);

  controller.abort();

  await rejects(
    promise,
    (error: unknown) => error instanceof DOMException && error.name === 'AbortError'
  );
});

// ── Listener cleanup (regression) ───────────────────────────────────────────────

void it('removes the abort listener once the timer resolves normally', async () => {
  const controller = new AbortController();
  let addCount = 0;
  let removeCount = 0;

  const originalAdd = controller.signal.addEventListener.bind(controller.signal);
  const originalRemove = controller.signal.removeEventListener.bind(controller.signal);

  controller.signal.addEventListener = ((...args: Parameters<typeof originalAdd>): void => {
    addCount += 1;
    originalAdd(...args);
  }) as typeof originalAdd;

  controller.signal.removeEventListener = ((...args: Parameters<typeof originalRemove>): void => {
    removeCount += 1;
    originalRemove(...args);
  }) as typeof originalRemove;

  await Delay.for(1, controller.signal);

  strictEqual(addCount, 1, 'Should register exactly one abort listener');
  strictEqual(removeCount, 1, 'Should remove the abort listener after the timer resolves normally');
});
