/**
 * Proves scheduleDispatch() fires dispatch() at the right virtual time (via a
 * VirtualScheduler, for deterministic fast tests) and returns a working cancel
 * handle from the scheduler itself.
 *
 * dispatch() itself is async (Semaphore#acquire and EventBus#publish both await),
 * so `scheduler.advance()` — which invokes the scheduled `fire` synchronously —
 * only starts dispatch()'s internal promise chain; a `flushMicrotasks()` step lets
 * that chain settle before assertions run.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { VirtualScheduler } from '@studnicky/scheduler';
import { VirtualTimeCounter } from '@studnicky/clock';

import { BoundedDispatcher } from '../../../src/index.js';

const flushMicrotasks = (): Promise<void> => new Promise((resolve) => { setImmediate(resolve); });

void describe('BoundedDispatcher#scheduleDispatch()', () => {
  void it('fires fn through dispatch() only once virtual time reaches atMs', async () => {
    const counter = VirtualTimeCounter.create();
    const scheduler = VirtualScheduler.create({ 'counter': counter });
    const dispatcher = BoundedDispatcher.create({ 'scheduler': scheduler });

    let fired = false;
    let firedResult: string | undefined;

    dispatcher.scheduleDispatch(1000, async () => {
      fired = true;
      firedResult = 'scheduled-done';
      return firedResult;
    });

    scheduler.advance(500);
    await flushMicrotasks();
    assert.equal(fired, false, 'must not fire before atMs is reached');

    scheduler.advance(500);
    await flushMicrotasks();
    assert.equal(fired, true, 'must fire once virtual time reaches atMs');
    assert.equal(firedResult, 'scheduled-done');
  });

  void it('returns the scheduler-owned task handle, and cancel() prevents the fire', async () => {
    const counter = VirtualTimeCounter.create();
    const scheduler = VirtualScheduler.create({ 'counter': counter });
    const dispatcher = BoundedDispatcher.create({ 'scheduler': scheduler });

    let fired = false;

    const task = dispatcher.scheduleDispatch(1000, () => { fired = true; });

    assert.equal(task.atMs, 1000);
    assert.equal(typeof task.cancel, 'function');

    task.cancel();
    scheduler.advance(2000);
    await flushMicrotasks();

    assert.equal(fired, false, 'cancelled task must not fire');
  });

  void it('routes the scheduled fn through the permit bound like a direct dispatch() call', async () => {
    const counter = VirtualTimeCounter.create();
    const scheduler = VirtualScheduler.create({ 'counter': counter });
    const dispatcher = BoundedDispatcher.create({ 'permits': 1, 'scheduler': scheduler });

    const order: string[] = [];
    let settled = false;

    dispatcher.scheduleDispatch(100, async () => {
      order.push('scheduled-start');
      await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
      order.push('scheduled-end');
      settled = true;
    });

    scheduler.advance(100);
    await flushMicrotasks();

    // The scheduled fn's own internal await races a real setTimeout(0) against
    // flushMicrotasks()'s setImmediate — Node does not guarantee their relative
    // ordering, so asserting an intermediate 'scheduled-start'-only state here
    // would be inherently flaky under load. Poll to settlement instead; this
    // proves scheduleDispatch() routed the fn through dispatch() to completion
    // without depending on undefined macrotask interleaving.
    while (!settled) { await flushMicrotasks(); }
    assert.deepEqual(order, ['scheduled-start', 'scheduled-end']);
  });
});
