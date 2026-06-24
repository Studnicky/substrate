/**
 * Mutex Per-Key FSM Unit Tests
 *
 * Verifies the per-key state machine: unlocked → locked → queued → locked → unlocked.
 * Uses a TrackingMutex subclass that records every key transition.
 */

import {
  deepStrictEqual, ok, throws
} from 'node:assert/strict';
import { it } from 'node:test';
import {
  setTimeout as delay
} from 'node:timers/promises';

import type { MutexKeyStateType } from '../../../src/types/MutexKeyStateType.js';
import { Mutex } from '../../../src/mutex/index.js';

interface TransitionRecord {
  from: MutexKeyStateType;
  key: string;
  to: MutexKeyStateType;
}

class TrackingMutex extends Mutex<string> {
  readonly transitions: TransitionRecord[] = [];

  static tracked(): TrackingMutex {
    return new TrackingMutex();
  }

  protected override guardKey(from: MutexKeyStateType, to: MutexKeyStateType): boolean {
    return super.guardKey(from, to);
  }

  protected override onEnterKey(key: string, to: MutexKeyStateType, from: MutexKeyStateType): void {
    this.transitions.push({ from, key, to });
  }
}

/**
 * Subclass that exposes transitionKey publicly for illegal-edge testing.
 */
class ForcingMutex extends Mutex<string> {
  protected override guardKey(_from: MutexKeyStateType, to: MutexKeyStateType): boolean {
    // Block any transition TO 'unlocked' to test the throw path
    if (to === 'unlocked') return false;

    return super.guardKey(_from, to);
  }

  forceKeyTransition(key: string, to: MutexKeyStateType): void {
    this.transitionKey(key, to);
  }
}

it('records unlocked → locked when a key is acquired with no contention', async () => {
  const mutex = TrackingMutex.tracked();

  const release = await mutex.acquire('alpha');

  const first = mutex.transitions[0];

  ok(first !== undefined, 'At least one transition should be recorded');
  deepStrictEqual(first.key, 'alpha');
  deepStrictEqual(first.from, 'unlocked');
  deepStrictEqual(first.to, 'locked');

  release();
});

it('records locked → queued when a second acquire arrives while the key is held', async () => {
  const mutex = TrackingMutex.tracked();

  // Hold the lock — do not await the second acquire
  const firstRelease = await mutex.acquire('beta');

  // Start a second acquisition without awaiting — this queues it
  const pendingAcquire = mutex.acquire('beta');

  // Give the microtask queue a tick for the queued transition to fire
  await delay(0);

  const queuedTransition = mutex.transitions.find(
    (t) => t.key === 'beta' && t.from === 'locked' && t.to === 'queued'
  );

  ok(queuedTransition !== undefined, 'locked → queued transition should be recorded');

  // Clean up
  firstRelease();
  const secondRelease = await pendingAcquire;

  secondRelease();
});

it('records queued → locked when the lock is released to the next waiter', async () => {
  const mutex = TrackingMutex.tracked();

  const firstRelease = await mutex.acquire('gamma');
  const pendingAcquire = mutex.acquire('gamma');

  await delay(0);

  // Release first holder — hands off to queued waiter
  firstRelease();

  const secondRelease = await pendingAcquire;

  const handoffTransition = mutex.transitions.find(
    (t) => t.key === 'gamma' && t.from === 'queued' && t.to === 'locked'
  );

  ok(handoffTransition !== undefined, 'queued → locked transition should be recorded');

  secondRelease();
});

it('records locked → unlocked when the sole holder releases', async () => {
  const mutex = TrackingMutex.tracked();

  const release = await mutex.acquire('delta');

  release();

  // Allow microtasks to settle
  await delay(0);

  const unlockedTransition = mutex.transitions.find(
    (t) => t.key === 'delta' && t.from === 'locked' && t.to === 'unlocked'
  );

  ok(unlockedTransition !== undefined, 'locked → unlocked transition should be recorded');
});

it('throws when guardKey rejects the edge', () => {
  const mutex = new ForcingMutex();

  // Directly call forceKeyTransition targeting 'unlocked' which is blocked.
  throws(
    () => { mutex.forceKeyTransition('epsilon', 'unlocked'); },
    (error: unknown) => {
      ok(error instanceof Error, 'Should throw an Error');
      ok(
        error.message.includes('Illegal state transition'),
        `Error message should contain "Illegal state transition", got: ${error.message}`
      );

      return true;
    }
  );
});
