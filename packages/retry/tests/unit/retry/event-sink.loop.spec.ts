import type { EventSinkInterface } from '@studnicky/event-bus/interfaces';

import { RuntimeError } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { EventBus } from '@studnicky/event-bus/node';

import { RetryAttemptEventEntity, RetryContextDataEntity, RetrySuccessEventEntity } from '../../../src/entities/index.js';
import type { RetryEventTopicMapInterface } from '../../../src/interfaces/index.js';
import { Retry } from '../../../src/retry/index.js';

interface RecordedEventInterface {
  readonly 'payload': unknown;
  readonly 'topic': keyof RetryEventTopicMapInterface;
}

class RecordingEventSink implements EventSinkInterface<RetryEventTopicMapInterface> {
  readonly events: RecordedEventInterface[] = [];

  async publish<K extends keyof RetryEventTopicMapInterface>(
    topic: K,
    payload: RetryEventTopicMapInterface[K]
  ): Promise<void> {
    this.events.push({ 'payload': structuredClone(payload), 'topic': topic });
  }
}

class RejectingEventSink implements EventSinkInterface<RetryEventTopicMapInterface> {
  async publish<K extends keyof RetryEventTopicMapInterface>(
    _topic: K,
    _payload: RetryEventTopicMapInterface[K]
  ): Promise<void> {
    throw RuntimeError.create('telemetry delivery failed');
  }
}

class MutatingEventSink implements EventSinkInterface<RetryEventTopicMapInterface> {
  mutationWasPrevented = false;

  async publish<K extends keyof RetryEventTopicMapInterface>(
    topic: K,
    payload: RetryEventTopicMapInterface[K]
  ): Promise<void> {
    if (topic === 'retryScheduled') {
      const abortMutation = Reflect.set(payload, 'abort', true);
      const delayMutation = Reflect.set(payload, 'delayMs', 60_000);
      this.mutationWasPrevented = !abortMutation && !delayMutation;
    }
  }
}

function retryAfterOneFailure(eventSink: EventSinkInterface<RetryEventTopicMapInterface>): Retry {
  return Retry.create({
    'errorClassifier': () => ({ 'retryable': true }),
    'eventSink': eventSink,
    'maximumRetries': 1
  });
}

void describe('Retry event sink', () => {
  void it('publishes ordered schema-derived attempt, scheduled, and success snapshots', async () => {
    const eventSink = new RecordingEventSink();
    const retry = retryAfterOneFailure(eventSink);
    let attempts = 0;

    const result = await retry.execute(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw RuntimeError.create('transient');
      }
      return 'complete';
    });

    assert.equal(result, 'complete');
    assert.deepEqual(eventSink.events.map((event) => event.topic), ['attempt', 'retryScheduled', 'attempt', 'success']);
    assert.ok(RetryAttemptEventEntity.validate(eventSink.events[0]?.payload));
    assert.ok(RetryContextDataEntity.validate(eventSink.events[1]?.payload));
    assert.ok(RetryAttemptEventEntity.validate(eventSink.events[2]?.payload));
    assert.ok(RetrySuccessEventEntity.validate(eventSink.events[3]?.payload));
  });

  void it('accepts EventBus through the EventSinkInterface contract', async () => {
    const bus = EventBus.create<RetryEventTopicMapInterface>();
    const eventSink: EventSinkInterface<RetryEventTopicMapInterface> = bus;
    const receivedTopics: (keyof RetryEventTopicMapInterface)[] = [];

    bus.subscribe('attempt', async () => { receivedTopics.push('attempt'); });
    bus.subscribe('retryScheduled', async () => { receivedTopics.push('retryScheduled'); });
    bus.subscribe('success', async () => { receivedTopics.push('success'); });

    const retry = retryAfterOneFailure(eventSink);
    let attempts = 0;
    await retry.execute(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw RuntimeError.create('transient');
      }
      return 'complete';
    });

    await bus.drain();
    await bus.close();
    assert.deepEqual(receivedTopics, ['attempt', 'retryScheduled', 'attempt', 'success']);
  });

  void it('keeps terminal retry results independent of rejected telemetry publications', async () => {
    const retry = retryAfterOneFailure(new RejectingEventSink());
    let attempts = 0;

    const result = await retry.execute(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw RuntimeError.create('transient');
      }
      return 'complete';
    });

    await new Promise<void>((resolve) => { setImmediate(resolve); });
    assert.equal(result, 'complete');
    assert.equal(attempts, 2);
  });

  void it('freezes detached retry-scheduled snapshots before publication', async () => {
    const eventSink = new MutatingEventSink();
    const retry = retryAfterOneFailure(eventSink);
    let attempts = 0;

    const result = await retry.execute(async () => {
      attempts += 1;
      if (attempts === 1) {
        throw RuntimeError.create('transient');
      }
      return 'complete';
    });

    assert.equal(result, 'complete');
    assert.equal(attempts, 2);
    assert.equal(eventSink.mutationWasPrevented, true);
  });
});
