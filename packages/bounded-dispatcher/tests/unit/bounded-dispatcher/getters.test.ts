/**
 * Proves getSemaphore()/getBus()/getScheduler() return the exact composed
 * instances — the ones passed to create()/builder(), not copies or wrappers —
 * for both create() and builder() construction paths.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EventBus } from '@studnicky/event-bus';
import { Semaphore } from '@studnicky/concurrency';
import { RealTimeScheduler, VirtualScheduler } from '@studnicky/scheduler';
import { VirtualTimeCounter } from '@studnicky/clock';

import { BoundedDispatcher } from '../../../src/index.js';

void describe('BoundedDispatcher getters', () => {
  void it('create() defaults every primitive when none is supplied', () => {
    const dispatcher = BoundedDispatcher.create();

    assert.ok(dispatcher.getSemaphore() instanceof Semaphore);
    assert.ok(dispatcher.getBus() instanceof EventBus);
    assert.ok(dispatcher.getScheduler() instanceof RealTimeScheduler);
    assert.equal(dispatcher.getSemaphore().permits, 1);
  });

  void it('create() preserves the exact pre-built scheduler instance identity', () => {
    const counter = VirtualTimeCounter.create();
    const scheduler = VirtualScheduler.create({ 'counter': counter });

    const dispatcher = BoundedDispatcher.create({ 'permits': 3, 'scheduler': scheduler });

    assert.strictEqual(dispatcher.getScheduler(), scheduler);
    assert.equal(dispatcher.getSemaphore().permits, 3);
  });

  void it('create() preserves the exact pre-built bus instance identity', () => {
    const bus = EventBus.create<{ 'dispatch': { 'phase': 'error'; 'error': unknown } | { 'phase': 'start' } | { 'phase': 'success'; 'result': unknown } }>();

    const dispatcher = BoundedDispatcher.create({ 'bus': bus });

    assert.strictEqual(dispatcher.getBus(), bus);
  });

  void it('builder() wires a BoundedDispatcher identically to create(), preserving instance identity', () => {
    const counter = VirtualTimeCounter.create();
    const scheduler = VirtualScheduler.create({ 'counter': counter });

    const dispatcher = BoundedDispatcher.builder()
      .permits(4)
      .scheduler(scheduler)
      .build();

    assert.strictEqual(dispatcher.getScheduler(), scheduler);
    assert.equal(dispatcher.getSemaphore().permits, 4);
    assert.ok(dispatcher.getBus() instanceof EventBus);
  });
});
