/**
 * Mutex Reentrancy Guard Tests
 *
 * Tests that reentrant same-key calls into `beforeAcquire`/`onRelease`
 * overrides are detected and swallowed as recorded hook errors instead of
 * recursing or corrupting lock/queue state, while different-key operations
 * remain completely unaffected.
 */

import {
  ok, strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';

import { HookInvocationError, ReentrantHookInvocationError } from '@studnicky/errors';

import { Mutex } from '../../../src/mutex/index.js';

// ---------------------------------------------------------------------------
// Helper subclasses
// ---------------------------------------------------------------------------

class ReentrantBeforeAcquireMutex extends Mutex<string> {
  #reentered = false;

  protected override beforeAcquire(key: string): void {
    if (!this.#reentered) {
      this.#reentered = true;
      // Fire-and-forget reentrant acquire for the SAME key. It wins the
      // immediate-acquire race synchronously (the outer call is still
      // inside its own beforeAcquire firing and has not yet checked
      // `locks.has(key)`), so it self-releases once acquired to hand the
      // lock back to the outer caller, which picks it up off the queue.
      void this.acquire(key).then((release) => { release(); });
    }
  }

  getHookErrors(): readonly HookInvocationError[] {
    return this.hookErrors;
  }
}

class ReentrantOnReleaseMutex extends Mutex<string> {
  #reentered = false;
  #release1: (() => void) | undefined;

  setRelease1(release1: () => void): void {
    this.#release1 = release1;
  }

  protected override onRelease(_key: string): void {
    if (!this.#reentered && this.#release1 !== undefined) {
      this.#reentered = true;
      this.#release1();
    }
  }

  getHookErrors(): readonly HookInvocationError[] {
    return this.hookErrors;
  }
}

class DifferentKeysMutex extends Mutex<string> {
  readonly beforeAcquireKeys: string[] = [];
  readonly onReleaseKeys: string[] = [];

  protected override beforeAcquire(key: string): void {
    this.beforeAcquireKeys.push(key);
  }

  protected override onRelease(key: string): void {
    this.onReleaseKeys.push(key);
  }

  getHookErrors(): readonly HookInvocationError[] {
    return this.hookErrors;
  }
}

// ---------------------------------------------------------------------------
// beforeAcquire reentrancy
// ---------------------------------------------------------------------------

it('beforeAcquire reentrant same-key call is recorded as a swallowed error, no crash', async () => {
  const mutex = new ReentrantBeforeAcquireMutex();

  const outerRelease = await mutex.acquire('key1');

  strictEqual(mutex.getHookErrors().length, 1);
  const err = mutex.getHookErrors()[0];

  ok(err !== undefined, 'Expected a recorded hook error');
  ok(err instanceof HookInvocationError);
  strictEqual(err.hookName, 'beforeAcquire');
  ok(err.cause instanceof ReentrantHookInvocationError);

  ok(mutex.isLocked('key1'));

  outerRelease();

  ok(!mutex.isLocked('key1'));

  const release = await mutex.acquire('key1');

  release();

  ok(!mutex.isLocked('key1'));
});

// ---------------------------------------------------------------------------
// onRelease reentrancy
// ---------------------------------------------------------------------------

it('onRelease reentrant same-key call (hand-off case) is recorded as a swallowed error, no double hand-off', async () => {
  const mutex = new ReentrantOnReleaseMutex();
  const release1 = await mutex.acquire('key1');
  const pending2 = mutex.acquire('key1');
  const pending3 = mutex.acquire('key1');

  mutex.setRelease1(release1);

  release1();

  strictEqual(mutex.getHookErrors().length, 1);
  const err = mutex.getHookErrors()[0];

  ok(err !== undefined, 'Expected a recorded hook error');
  ok(err instanceof HookInvocationError);
  strictEqual(err.hookName, 'onRelease');
  ok(err.cause instanceof ReentrantHookInvocationError);

  ok(mutex.isLocked('key1'));

  const release2 = await pending2;

  release2();

  ok(mutex.isLocked('key1'));

  const release3 = await pending3;

  release3();

  ok(!mutex.isLocked('key1'));
  ok(mutex.isComplete());
});

// ---------------------------------------------------------------------------
// Different keys unaffected
// ---------------------------------------------------------------------------

it('concurrent acquire/release for different keys is completely unaffected by the reentrancy guard', async () => {
  const mutex = new DifferentKeysMutex();

  const [releaseA, releaseB] = await Promise.all([
    mutex.acquire('keyA'),
    mutex.acquire('keyB')
  ]);

  strictEqual(mutex.beforeAcquireKeys.length, 2);
  ok(mutex.beforeAcquireKeys.includes('keyA'));
  ok(mutex.beforeAcquireKeys.includes('keyB'));

  releaseA();
  releaseB();

  strictEqual(mutex.onReleaseKeys.length, 2);
  ok(mutex.onReleaseKeys.includes('keyA'));
  ok(mutex.onReleaseKeys.includes('keyB'));

  ok(mutex.isComplete());
  strictEqual(mutex.getHookErrors().length, 0);
});
