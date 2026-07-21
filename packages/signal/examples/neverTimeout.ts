/** neverTimeout — demonstrates Signal.never and deadline composition. Run: npx tsx examples/neverTimeout.ts */

import assert from 'node:assert/strict';

// #region usage
import { Signal } from '../src/index.js';

const signals = Signal.create();

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

  /** compose() returns an AbortSignal that is not yet aborted for a generous deadline. */
  static async deadlineNotYetAborted(): Promise<void> {
    const signal = await signals.compose({ 'deadlineMs': 5000 });

    assert.ok(signal instanceof AbortSignal, 'deadline composition returns an AbortSignal');
    assert.ok(!signal.aborted, 'signal with 5 s deadline is not yet aborted');
    console.log(`deadlineNotYetAborted: aborted=${signal.aborted}`);
  }

  /** compose() with distinct deadlines returns distinct signal instances. */
  static async deadlinesReturnDistinctInstances(): Promise<void> {
    const a = await signals.compose({ 'deadlineMs': 1000 });
    const b = await signals.compose({ 'deadlineMs': 2000 });

    assert.notStrictEqual(a, b, 'different deadlines are distinct AbortSignal instances');
    console.log(`deadlinesReturnDistinctInstances: a===b=${a === b}`);
  }
}

NeverTimeoutDemo.neverIsSingleton();
NeverTimeoutDemo.neverIsNotAborted();
await NeverTimeoutDemo.deadlineNotYetAborted();
await NeverTimeoutDemo.deadlinesReturnDistinctInstances();
// #endregion usage

console.log('neverTimeout: all assertions passed');
