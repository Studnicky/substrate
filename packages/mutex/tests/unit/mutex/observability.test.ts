/**
 * Mutex Observability Hook Tests
 *
 * Tests that protected lifecycle hooks fire with the correct arguments,
 * using subclasses that override the hooks to capture events.
 */

import {
  ok, strictEqual
} from 'node:assert/strict';
import { it } from 'node:test';
import {
  setTimeout as delay
} from 'node:timers/promises';

import { Mutex } from '../../../src/mutex/index.js';

// ---------------------------------------------------------------------------
// Helper subclasses
// ---------------------------------------------------------------------------

class AcquireTrackingMutex extends Mutex<string> {
  readonly acquireEvents: Array<{ key: string; waitTimeMs: number }> = [];

  protected override afterAcquire(key: string, waitTimeMs: number): void {
    this.acquireEvents.push({ key, waitTimeMs });
  }
}

class ReleaseTrackingMutex extends Mutex<string> {
  readonly releaseEvents: Array<{ holdTimeMs: number; key: string }> = [];

  protected override beforeRelease(key: string, holdTimeMs: number): void {
    this.releaseEvents.push({ holdTimeMs, key });
  }
}

class TimeoutTrackingMutex extends Mutex<string> {
  readonly timeoutEvents: Array<{ key: string; timeoutMs: number }> = [];

  protected override onTimeout(key: string, timeoutMs: number): void {
    this.timeoutEvents.push({ key, timeoutMs });
  }
}

class ContentionTrackingMutex extends Mutex<string> {
  readonly contentionEvents: Array<{ key: string; queueSize: number }> = [];

  protected override onContended(key: string, queueSize: number): void {
    this.contentionEvents.push({ key, queueSize });
  }
}

class AfterReleaseTrackingMutex extends Mutex<string> {
  readonly afterReleaseEvents: string[] = [];

  protected override afterRelease(key: string): void {
    this.afterReleaseEvents.push(key);
  }
}

class ThrowingMutex extends Mutex<string> {
  protected override afterAcquire(_key: string, _waitTimeMs: number): void {
    throw new Error('Hook error');
  }

  protected override beforeRelease(_key: string, _holdTimeMs: number): void {
    throw new Error('Hook error');
  }
}

class ThrowingQueueMutex extends Mutex<string> {
  readonly acquireKeys: string[] = [];

  protected override afterAcquire(key: string, _waitTimeMs: number): void {
    this.acquireKeys.push(`acquired-${key}`);

    if (key === 'key1') {
      throw new Error('Hook error');
    }
  }
}

class AllHooksMutex extends Mutex<string> {
  readonly acquired: number[] = [];
  readonly released: number[] = [];
  totalHoldTime = 0;
  totalWaitTime = 0;

  protected override afterAcquire(_key: string, waitTimeMs: number): void {
    this.acquired.push(waitTimeMs);
    this.totalWaitTime += waitTimeMs;
  }

  protected override beforeRelease(_key: string, holdTimeMs: number): void {
    this.released.push(holdTimeMs);
    this.totalHoldTime += holdTimeMs;
  }
}

// ---------------------------------------------------------------------------
// afterAcquire
// ---------------------------------------------------------------------------

it('afterAcquire fires when lock is acquired immediately', async () => {
  const mutex = new AcquireTrackingMutex();
  const release = await mutex.acquire('key1');

  strictEqual(mutex.acquireEvents.length, 1);
  const ev = mutex.acquireEvents[0];

  ok(ev !== undefined, 'Expected acquire event');
  strictEqual(ev.key, 'key1');
  ok(ev.waitTimeMs >= 0);
  ok(ev.waitTimeMs < 10);

  release();
});

it('afterAcquire fires when lock is acquired after waiting', async () => {
  const mutex = new AcquireTrackingMutex();
  const release1 = await mutex.acquire('key1');

  strictEqual(mutex.acquireEvents.length, 1);

  const promise2 = mutex.acquire('key1');

  await delay(50);
  release1();

  const release2 = await promise2;

  strictEqual(mutex.acquireEvents.length, 2);
  const ev = mutex.acquireEvents[1];

  ok(ev !== undefined, 'Expected second acquire event');
  strictEqual(ev.key, 'key1');
  ok(ev.waitTimeMs >= 40);

  release2();
});

it('afterAcquire tracks separate keys independently', async () => {
  const mutex = new AcquireTrackingMutex();
  const release1 = await mutex.acquire('key1');
  const release2 = await mutex.acquire('key2');

  strictEqual(mutex.acquireEvents.length, 2);
  const [ev0, ev1] = mutex.acquireEvents;

  ok(ev0 !== undefined && ev1 !== undefined, 'Expected two events');
  strictEqual(ev0.key, 'key1');
  strictEqual(ev1.key, 'key2');

  release1();
  release2();
});

// ---------------------------------------------------------------------------
// beforeRelease
// ---------------------------------------------------------------------------

it('beforeRelease fires when lock is released', async () => {
  const mutex = new ReleaseTrackingMutex();
  const release = await mutex.acquire('key1');

  await delay(50);
  release();

  strictEqual(mutex.releaseEvents.length, 1);
  const ev = mutex.releaseEvents[0];

  ok(ev !== undefined, 'Expected release event');
  strictEqual(ev.key, 'key1');
  ok(ev.holdTimeMs >= 40);
});

it('beforeRelease tracks hold time for each lock/release cycle', async () => {
  const mutex = new ReleaseTrackingMutex();
  const release1 = await mutex.acquire('key1');

  await delay(30);
  release1();

  const release2 = await mutex.acquire('key1');

  await delay(30);
  release2();

  strictEqual(mutex.releaseEvents.length, 2);
  const [ev0, ev1] = mutex.releaseEvents;

  ok(ev0 !== undefined && ev1 !== undefined, 'Expected two release events');
  ok(ev0.holdTimeMs >= 20);
  ok(ev1.holdTimeMs >= 20);
});

// ---------------------------------------------------------------------------
// onTimeout
// ---------------------------------------------------------------------------

it('onTimeout fires when lock acquisition times out', async () => {
  const mutex = new TimeoutTrackingMutex({ timeout: 50 });
  const release1 = await mutex.acquire('key1');

  try {
    await mutex.acquire('key1');
    throw new Error('Expected timeout error');
  } catch {
    strictEqual(mutex.timeoutEvents.length, 1);
    const ev = mutex.timeoutEvents[0];

    ok(ev !== undefined, 'Expected timeout event');
    strictEqual(ev.key, 'key1');
    strictEqual(ev.timeoutMs, 50);
  }

  release1();
});

// ---------------------------------------------------------------------------
// onContended
// ---------------------------------------------------------------------------

it('onContended fires when lock is held and a waiter queues', async () => {
  const mutex = new ContentionTrackingMutex();
  const release1 = await mutex.acquire('key1');
  const promise2 = mutex.acquire('key1');

  strictEqual(mutex.contentionEvents.length, 1);
  const ev = mutex.contentionEvents[0];

  ok(ev !== undefined, 'Expected contention event');
  strictEqual(ev.key, 'key1');
  strictEqual(ev.queueSize, 0);

  release1();
  const release2 = await promise2;

  release2();
});

// ---------------------------------------------------------------------------
// afterRelease
// ---------------------------------------------------------------------------

it('afterRelease fires after lock is completely released', async () => {
  const mutex = new AfterReleaseTrackingMutex();
  const release = await mutex.acquire('key1');

  release();

  strictEqual(mutex.afterReleaseEvents.length, 1);
  strictEqual(mutex.afterReleaseEvents[0], 'key1');
});

// ---------------------------------------------------------------------------
// Hook error isolation
// ---------------------------------------------------------------------------

it('does not break mutex functionality if afterAcquire and beforeRelease throw', async () => {
  const mutex = new ThrowingMutex();
  const release = await mutex.acquire('key1');

  ok(mutex.isLocked('key1'));

  release();

  ok(!mutex.isLocked('key1'));
});

it('continues processing queue if afterAcquire throws', async () => {
  const mutex = new ThrowingQueueMutex();
  const release1 = await mutex.acquire('key1');
  const promise2 = mutex.acquire('key1');

  release1();

  const release2 = await promise2;

  release2();

  strictEqual(mutex.acquireKeys.length, 2);
  strictEqual(mutex.acquireKeys[0], 'acquired-key1');
  strictEqual(mutex.acquireKeys[1], 'acquired-key1');
});

// ---------------------------------------------------------------------------
// Combined metrics tracking
// ---------------------------------------------------------------------------

it('tracks all metrics in a single subclass', async () => {
  const mutex = new AllHooksMutex();
  const release1 = await mutex.acquire('key1');

  await delay(30);
  release1();

  const release2 = await mutex.acquire('key2');

  release2();

  strictEqual(mutex.acquired.length, 2);
  strictEqual(mutex.released.length, 2);
  ok(mutex.totalHoldTime >= 20);
});
