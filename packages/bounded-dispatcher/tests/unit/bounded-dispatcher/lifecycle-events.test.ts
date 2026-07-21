/**
 * Proves dispatch() publishes the expected 'dispatch' lifecycle events onto the
 * composed EventBus — a 'start' payload before fn runs, then 'success' (with the
 * result) or 'error' (with the thrown value) after fn settles.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { BoundedDispatcherTopicMapInterface } from '../../../src/index.js';

import { BoundedDispatcher } from '../../../src/index.js';

void describe('BoundedDispatcher#dispatch() lifecycle events', () => {
  void it('publishes start then success for a resolving fn', async () => {
    const dispatcher = BoundedDispatcher.create();
    const received: BoundedDispatcherTopicMapInterface['dispatch'][] = [];

    dispatcher.getBus().subscribe('dispatch', (payload) => { received.push(payload); });

    const result = await dispatcher.dispatch(async () => 'ok');
    await dispatcher.getBus().drain();

    assert.equal(result, 'ok');
    assert.deepEqual(received, [
      { 'phase': 'start' },
      { 'phase': 'success', 'result': 'ok' }
    ]);
  });

  void it('publishes start then error for a rejecting fn, and rethrows', async () => {
    const dispatcher = BoundedDispatcher.create();
    const received: BoundedDispatcherTopicMapInterface['dispatch'][] = [];
    const boom = new Error('boom');

    dispatcher.getBus().subscribe('dispatch', (payload) => { received.push(payload); });

    await assert.rejects(
      dispatcher.dispatch(async () => { throw boom; }),
      boom
    );
    await dispatcher.getBus().drain();

    assert.deepEqual(received, [
      { 'phase': 'start' },
      { 'phase': 'error', 'error': boom }
    ]);
  });

  void it('publishes one start/success pair per dispatch() call, independent of concurrency', async () => {
    const dispatcher = BoundedDispatcher.create({ 'permits': 2 });
    const startCount = { 'value': 0 };
    const successCount = { 'value': 0 };

    dispatcher.getBus().subscribe('dispatch', (payload) => {
      if (payload.phase === 'start') { startCount.value += 1; }
      if (payload.phase === 'success') { successCount.value += 1; }
    });

    await Promise.all([1, 2, 3].map((n) => dispatcher.dispatch(() => n)));
    await dispatcher.getBus().drain();

    assert.equal(startCount.value, 3);
    assert.equal(successCount.value, 3);
  });
});
