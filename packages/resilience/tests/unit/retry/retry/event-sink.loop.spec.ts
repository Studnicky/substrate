import type { EventSinkInterface } from '@studnicky/event-bus/interfaces';

import { RuntimeError } from '@studnicky/errors/node';
import { EventBus } from '@studnicky/event-bus/node';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { setImmediate } from 'node:timers/promises';

import type { RetryEventTopicMapInterface } from '../../../../src/retry/interfaces/index.js';

import { RetryAttemptEventEntity, RetryContextDataEntity, RetrySuccessEventEntity } from '../../../../src/retry/entities/index.js';
import { Retry } from '../../../../src/retry/retry/index.js';

interface RecordedEventInterface {
  readonly 'payload': unknown;
  readonly 'topic': keyof RetryEventTopicMapInterface;
}

class RecordingEventSink implements EventSinkInterface<RetryEventTopicMapInterface> {
  readonly events: RecordedEventInterface[] = [];

  publish<K extends keyof RetryEventTopicMapInterface>(
    topic: K,
    payload: RetryEventTopicMapInterface[K]
  ): Promise<void> {
    try {
      this.events.push({ 'payload': structuredClone(payload), 'topic': topic });
    } catch (cause) {
      throw RuntimeError.create('Retry event payload is not structured-cloneable', { 'cause': cause });
    }
    const published = Promise.resolve();
    return published;
  }
}

class RejectingEventSink implements EventSinkInterface<RetryEventTopicMapInterface> {
  publish<K extends keyof RetryEventTopicMapInterface>(
    _topic: K,
    _payload: RetryEventTopicMapInterface[K]
  ): Promise<void> {
    const failure = Promise.reject(RuntimeError.create('telemetry delivery failed'));
    return failure;
  }
}

class MutatingEventSink implements EventSinkInterface<RetryEventTopicMapInterface> {
  mutationWasPrevented = false;

  publish<K extends keyof RetryEventTopicMapInterface>(
    topic: K,
    payload: RetryEventTopicMapInterface[K]
  ): Promise<void> {
    if (topic === 'retryScheduled') {
      const abortMutation = Reflect.set(payload, 'abort', true);
      const delayMutation = Reflect.set(payload, 'delayMs', 60_000);
      this.mutationWasPrevented = !abortMutation && !delayMutation;
    }
    const published = Promise.resolve();
    return published;
  }
}

class FailOnceOperation {
  attempts = 0;

  readonly run = (): Promise<string> => {
    this.attempts += 1;
    let outcome = Promise.resolve('complete');
    if (this.attempts === 1) {
      outcome = Promise.reject(RuntimeError.create('transient'));
    }
    return outcome;
  };
}

class RetryEventSinkFixtures {
  static retryAfterOneFailure(eventSink: EventSinkInterface<RetryEventTopicMapInterface>): Retry {
    const retry = Retry.create({
      'errorClassifier': RetryEventSinkFixtures.classifyRetryable,
      'eventSink': eventSink,
      'maximumRetries': 1
    });
    return retry;
  }

  private static classifyRetryable(): { 'retryable': true } {
    const classification = { 'retryable': true } as const;
    return classification;
  }
}

void describe('Retry event sink', () => {
  void it('publishes ordered schema-derived attempt, scheduled, and success snapshots', async () => {
    const eventSink = new RecordingEventSink();
    const retry = RetryEventSinkFixtures.retryAfterOneFailure(eventSink);
    const operation = new FailOnceOperation();

    const result = await retry.execute(operation.run);

    assert.equal(result, 'complete');
    assert.deepEqual(eventSink.events.map((event) => {return event.topic;}), ['attempt', 'retryScheduled', 'attempt', 'success']);
    assert.ok(RetryAttemptEventEntity.validate(eventSink.events[0]?.payload));
    assert.ok(RetryContextDataEntity.validate(eventSink.events[1]?.payload));
    assert.ok(RetryAttemptEventEntity.validate(eventSink.events[2]?.payload));
    assert.ok(RetrySuccessEventEntity.validate(eventSink.events[3]?.payload));
  });

  void it('accepts EventBus through the EventSinkInterface contract', async () => {
    const bus = EventBus.create<RetryEventTopicMapInterface>();
    const eventSink: EventSinkInterface<RetryEventTopicMapInterface> = bus;
    const receivedTopics: (keyof RetryEventTopicMapInterface)[] = [];

    bus.subscribe('attempt', () => { receivedTopics.push('attempt'); });
    bus.subscribe('retryScheduled', () => { receivedTopics.push('retryScheduled'); });
    bus.subscribe('success', () => { receivedTopics.push('success'); });

    const retry = RetryEventSinkFixtures.retryAfterOneFailure(eventSink);
    const operation = new FailOnceOperation();
    await retry.execute(operation.run);

    await bus.drain();
    await bus.close();
    assert.deepEqual(receivedTopics, ['attempt', 'retryScheduled', 'attempt', 'success']);
  });

  void it('keeps terminal retry results independent of rejected telemetry publications', async () => {
    const retry = RetryEventSinkFixtures.retryAfterOneFailure(new RejectingEventSink());
    const operation = new FailOnceOperation();

    const result = await retry.execute(operation.run);

    await setImmediate();
    assert.equal(result, 'complete');
    assert.equal(operation.attempts, 2);
  });

  void it('freezes detached retry-scheduled snapshots before publication', async () => {
    const eventSink = new MutatingEventSink();
    const retry = RetryEventSinkFixtures.retryAfterOneFailure(eventSink);
    const operation = new FailOnceOperation();

    const result = await retry.execute(operation.run);

    assert.equal(result, 'complete');
    assert.equal(operation.attempts, 2);
    assert.equal(eventSink.mutationWasPrevented, true);
  });
});
