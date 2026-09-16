import { RuntimeError } from '@studnicky/errors/node';
/** eventSinkRetry — publish retry lifecycle snapshots to EventBus. Run: npx tsx examples/eventSinkRetry.ts */
import { EventBus } from '@studnicky/event-bus/node';
import assert from 'node:assert/strict';

import type { RetryEventTopicMapInterface } from '../src/interfaces/index.js';

import { Retry } from '../src/index.js';

class EventSinkRetryExample {
  static async run(): Promise<void> {
    const bus = EventBus.create<RetryEventTopicMapInterface>();
    const topics: (keyof RetryEventTopicMapInterface)[] = [];

    bus.subscribe('attempt', () => {
      topics.push('attempt');
      const result = Promise.resolve();
      return result;
    });
    bus.subscribe('retryScheduled', () => {
      topics.push('retryScheduled');
      const result = Promise.resolve();
      return result;
    });
    bus.subscribe('success', () => {
      topics.push('success');
      const result = Promise.resolve();
      return result;
    });

    const retry = Retry.create({
      'errorClassifier': () => {
        const result = { 'retryable': true };
        return result;
      },
      'eventSink': bus,
      'maximumRetries': 1
    });

    let attempts = 0;
    const result = await retry.execute(() => {
      attempts += 1;
      if (attempts === 1) {
        const error = Promise.reject(RuntimeError.create('transient'));
        return error;
      }
      const success = Promise.resolve('complete');
      return success;
    });

    await bus.drain();
    await bus.close();

    assert.equal(result, 'complete');
    assert.deepEqual(topics, ['attempt', 'retryScheduled', 'attempt', 'success']);
    console.log('eventSinkRetry: EventBus received retry lifecycle snapshots');
  }
}

await EventSinkRetryExample.run();
