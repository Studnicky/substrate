/** compose — demonstrates all four Signal#compose cases. Run: npx tsx examples/compose.ts */

import assert from 'node:assert/strict';

// #region usage
import { Signal, SignalError } from '../src/index.js';

const signals = Signal.create();

class ComposeDemo {
  /** Case 1: both caller signal + deadlineMs — returns AbortSignal.any composite. */
  static async caseCallerAndDeadline(): Promise<void> {
    const controller = new AbortController();
    const signal = await signals.compose({ 'deadlineMs': 5000, 'signal': controller.signal });

    assert.ok(signal instanceof AbortSignal, 'composite is an AbortSignal');
    assert.ok(!signal.aborted, 'composite is not yet aborted');
    console.log(`caseCallerAndDeadline: aborted=${signal.aborted}`);
  }

  /** Case 2: caller signal only — returns that signal unchanged. */
  static async caseCallerOnly(): Promise<void> {
    const controller = new AbortController();
    const signal = await signals.compose({ 'signal': controller.signal });

    assert.strictEqual(signal, controller.signal, 'returns the caller signal directly');
    assert.ok(!signal.aborted, 'signal is not aborted');
    console.log(`caseCallerOnly: same reference=${signal === controller.signal}`);
  }

  /** Case 3: deadlineMs only — returns a timeout signal. */
  static async caseDeadlineOnly(): Promise<void> {
    const signal = await signals.compose({ 'deadlineMs': 5000 });

    assert.ok(signal instanceof AbortSignal, 'returns an AbortSignal');
    assert.ok(!signal.aborted, 'not yet aborted at 5 s');
    console.log(`caseDeadlineOnly: aborted=${signal.aborted}`);
  }

  /** Case 4: neither — returns the never-aborting sentinel. */
  static async caseNeither(): Promise<void> {
    const composed = await signals.compose({});
    const sentinel = Signal.never();

    assert.strictEqual(composed, sentinel, 'compose({}) returns the same object as Signal.never()');
    assert.ok(!composed.aborted, 'sentinel is never aborted');
    console.log(`caseNeither: compose({}) === Signal.never() → ${composed === sentinel}`);
  }

  /** deadlineMs of 0 is valid (non-negative) — AbortSignal.timeout(0) aborts immediately. */
  static async caseZeroDeadline(): Promise<void> {
    const signal = await signals.compose({ 'deadlineMs': 0 });
    assert.ok(signal instanceof AbortSignal, 'zero deadline produces an AbortSignal');
    console.log(`caseZeroDeadline: is AbortSignal=${signal instanceof AbortSignal}`);
  }

  /** Negative deadlineMs throws SignalError. */
  static async caseInvalidNegative(): Promise<void> {
    let caught: unknown;
    try {
      await signals.compose({ 'deadlineMs': -1 });
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof SignalError, 'throws SignalError for negative deadlineMs');
    console.log(`caseInvalidNegative: threw SignalError=${caught instanceof SignalError}`);
  }

  /** NaN deadlineMs throws SignalError. */
  static async caseInvalidNaN(): Promise<void> {
    let caught: unknown;
    try {
      await signals.compose({ 'deadlineMs': NaN });
    } catch (err) {
      caught = err;
    }
    assert.ok(caught instanceof SignalError, 'throws SignalError for NaN deadlineMs');
    console.log(`caseInvalidNaN: threw SignalError=${caught instanceof SignalError}`);
  }

}

await ComposeDemo.caseCallerAndDeadline();
await ComposeDemo.caseCallerOnly();
await ComposeDemo.caseDeadlineOnly();
await ComposeDemo.caseNeither();
await ComposeDemo.caseZeroDeadline();
await ComposeDemo.caseInvalidNegative();
await ComposeDemo.caseInvalidNaN();
// #endregion usage

console.log('compose: all assertions passed');
