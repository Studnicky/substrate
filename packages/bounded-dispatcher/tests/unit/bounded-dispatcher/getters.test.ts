/** Proves getBus() returns the exact composed event bus. */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EventBus } from '@studnicky/event-bus';

import type { BoundedDispatcherTopicMapInterface } from '../../../src/index.js';

import { BoundedDispatcher } from '../../../src/index.js';

void describe('BoundedDispatcher getBus()', () => {
  void it('create() supplies an event bus when none is configured', () => {
    const dispatcher = BoundedDispatcher.create();

    assert.ok(dispatcher.getBus() instanceof EventBus);
  });

  void it('create() preserves the exact pre-built bus instance identity', () => {
    const bus = EventBus.create<BoundedDispatcherTopicMapInterface>();

    const dispatcher = BoundedDispatcher.create({ 'bus': bus });

    assert.strictEqual(dispatcher.getBus(), bus);
  });
});
