/** neverTimeout — demonstrates Signal.never singleton and Signal.timeout. Run: npx tsx examples/neverTimeout.ts */

import assert from 'node:assert/strict';

// #region usage
import { Signal } from '../src/index.js';

class NeverTimeoutDemo {
  /** Signal.never() returns the same singleton on every call. */
  static neverIsSingleton(): void {
    const a = Signal.never();
    const b = Signal.never();
    const c = Signal.never();

    assert.strictEqual(a, b, 'first and second calls return the same object');
    assert.strictEqual(b, c, 'second and third calls return the same object');
    console.log(`neverIsSingleton: a===b=${a === b}, b===c=${b === c}`);
  }

  /** Signal.never() is never aborted. */
  static neverIsNotAborted(): void {
    const signal = Signal.never();

    assert.ok(!signal.aborted, 'sentinel is not aborted');
    console.log(`neverIsNotAborted: aborted=${signal.aborted}`);
  }

  /** Signal.timeout returns an AbortSignal that is not yet aborted for a generous deadline. */
  static timeoutNotYetAborted(): void {
    const signal = Signal.timeout(5000);

    assert.ok(signal instanceof AbortSignal, 'Signal.timeout returns an AbortSignal');
    assert.ok(!signal.aborted, 'signal with 5 s deadline is not yet aborted');
    console.log(`timeoutNotYetAborted: aborted=${signal.aborted}`);
  }

  /** Signal.timeout with distinct durations returns distinct signal instances. */
  static timeoutReturnsDistinctInstances(): void {
    const a = Signal.timeout(1000);
    const b = Signal.timeout(2000);

    assert.notStrictEqual(a, b, 'different timeouts are distinct AbortSignal instances');
    console.log(`timeoutReturnsDistinctInstances: a===b=${a === b}`);
  }
}

NeverTimeoutDemo.neverIsSingleton();
NeverTimeoutDemo.neverIsNotAborted();
NeverTimeoutDemo.timeoutNotYetAborted();
NeverTimeoutDemo.timeoutReturnsDistinctInstances();
// #endregion usage

console.log('neverTimeout: all assertions passed');
