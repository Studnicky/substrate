import { RuntimeError, HookInvoker } from '@studnicky/errors/node';
import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { ScenarioFileCompiler } from '@studnicky/scenario-kit/node';

import { EventBus } from '../../src/EventBus.js';
import type { EventSinkInterface } from '../../src/interfaces/index.js';
import type { BusQueueOptionsEntity } from '../../src/entities/BusQueueOptionsEntity.js';
import { EventBusScenarioCaseEntity } from './entities/EventBusScenarioCaseEntity.js';
import scenarioGroups from './EventBus.scenarios.json' with { type: 'json' };

async function flushMicrotasks(times = 20): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

interface TestTopics {
  ping: string;
  count: number;
}

interface HookTopics {
  'order:created': { 'id': string };
  'order:updated': { 'id': string };
}

type ScenarioCase = EventBusScenarioCaseEntity.Type;
type ScenarioShape = ScenarioCase['shape'];

type ScenarioRunner = (scenarioCase: ScenarioCase) => Promise<void> | void;

type RunnerMap = { [K in ScenarioShape]: ScenarioRunner };

const fileIntake = ScenarioFileCompiler.compileIntake(EventBusScenarioCaseEntity.Schema, EventBusScenarioCaseEntity.Node);

function requireError(value: unknown): Error {
  if (!(value instanceof Error)) {
    throw RuntimeError.create('Expected an Error instance');
  }
  return value;
}

function requireDefined<TValue>(value: TValue | undefined, context: string): TValue {
  if (value === undefined) {
    throw RuntimeError.create(`Scenario ${context} is required`);
  }
  return value;
}

function requireTopic<TTopic extends string>(topic: string | undefined, expected: TTopic): TTopic {
  if (topic !== expected) {
    throw RuntimeError.create(`Expected topic ${expected}, received ${String(topic)}`);
  }
  return expected;
}

function requireHookTopic(topic: string): keyof HookTopics {
  if (topic === 'order:created' || topic === 'order:updated') {
    return topic;
  }
  throw RuntimeError.create(`Unknown hook topic: ${topic}`);
}

function expectedNumber(value: unknown, context: string): number {
  if (typeof value !== 'number') {
    throw RuntimeError.create(`Scenario expected.${context} must be a number`);
  }
  return value;
}

function expectedStringArray(value: unknown, context: string): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw RuntimeError.create(`Scenario expected.${context} must be a string array`);
  }
  return value;
}

class ObservedBus extends EventBus<HookTopics> {
  static createObserved(): ObservedBus {
    return new ObservedBus();
  }
  readonly publishEvents: Array<{ 'topic': keyof HookTopics; 'payload': HookTopics[keyof HookTopics] }> = [];
  readonly subscribeEvents: Array<keyof HookTopics> = [];
  readonly unsubscribeEvents: Array<keyof HookTopics> = [];
  readonly deliverEvents: Array<{ 'topic': keyof HookTopics; 'payload': HookTopics[keyof HookTopics] }> = [];
  readonly handlerErrors: Array<{ 'topic': keyof HookTopics; 'error': unknown }> = [];
  readonly enqueueEvents: Array<keyof HookTopics> = [];
  readonly dequeueEvents: Array<keyof HookTopics> = [];
  readonly dropEvents: Array<keyof HookTopics> = [];
  readonly disposeCount: number[] = [];

  protected override onPublish<K extends keyof HookTopics>(topic: K, payload: HookTopics[K]): void {
    this.publishEvents.push({ 'topic': topic, 'payload': payload });
  }
  protected override onSubscribe<K extends keyof HookTopics>(topic: K): void {
    this.subscribeEvents.push(topic);
  }
  protected override onUnsubscribe<K extends keyof HookTopics>(topic: K): void {
    this.unsubscribeEvents.push(topic);
  }
  protected override onDeliver<K extends keyof HookTopics>(topic: K, payload: HookTopics[K]): void {
    this.deliverEvents.push({ 'topic': topic, 'payload': payload });
  }
  protected override onHandlerError<K extends keyof HookTopics, TError>(topic: K, error: TError): void {
    this.handlerErrors.push({ 'topic': topic, 'error': error });
  }
  protected override onEnqueue<K extends keyof HookTopics>(topic: K): void {
    this.enqueueEvents.push(topic);
  }
  protected override onDequeue<K extends keyof HookTopics>(topic: K): void {
    this.dequeueEvents.push(topic);
  }
  protected override onDrop<K extends keyof HookTopics>(topic: K): void {
    this.dropEvents.push(topic);
  }
  protected override onDispose(): void {
    this.disposeCount.push(1);
  }
}

class RecordingHookInvoker extends HookInvoker {
  readonly hookNames: string[] = [];
  readonly causes: unknown[] = [];

  protected override onHookError(hookName: string, cause: Error): void {
    this.hookNames.push(hookName);
    this.causes.push(cause);
  }
}

class RejectingLifecycleBus extends EventBus<HookTopics> {
  static createRejecting(): RejectingLifecycleBus {
    return new RejectingLifecycleBus();
  }
  readonly subscribeFailure = RuntimeError.create('subscribe hook rejected');
  readonly unsubscribeFailure = RuntimeError.create('unsubscribe hook rejected');
  readonly recordingHooks = new RecordingHookInvoker();
  protected override readonly hooks = this.recordingHooks;

  protected override async onSubscribe(): Promise<void> {
    throw this.subscribeFailure;
  }

  protected override async onUnsubscribe(): Promise<void> {
    throw this.unsubscribeFailure;
  }
}

class RejectingQueueHooksBus extends EventBus<HookTopics> {
  static createRejecting(): RejectingQueueHooksBus {
    return new RejectingQueueHooksBus();
  }
  readonly enqueueFailure = RuntimeError.create('enqueue hook rejected');
  readonly dequeueFailure = RuntimeError.create('dequeue hook rejected');
  readonly deliverFailure = RuntimeError.create('deliver hook rejected');
  readonly recordingHooks = new RecordingHookInvoker();
  protected override readonly hooks = this.recordingHooks;

  protected override async onEnqueue(): Promise<void> {
    throw this.enqueueFailure;
  }

  protected override async onDequeue(): Promise<void> {
    throw this.dequeueFailure;
  }

  protected override async onDeliver(): Promise<void> {
    throw this.deliverFailure;
  }
}

class OverflowObservedBus extends EventBus<{ 'x': string }> {
  static createObserved(config?: BusQueueOptionsEntity.InputType): OverflowObservedBus {
    return new OverflowObservedBus(config);
  }
  readonly overflowDepths: number[] = [];

  protected override onOverflow<K extends 'x'>(_topic: K, depth: number): void {
    this.overflowDepths.push(depth);
  }
}

class IntrospectableBus extends EventBus<TestTopics> {
  static createIntrospectable(): IntrospectableBus {
    return new IntrospectableBus();
  }
  readonly #topicSubscriberCounts = new Map<keyof TestTopics, number>();

  hasTopic(topic: keyof TestTopics): boolean {
    const subscriberCount = this.#topicSubscriberCounts.get(topic) ?? 0;
    return subscriberCount > 0;
  }

  protected override onSubscribe<K extends keyof TestTopics>(topic: K): void {
    const subscriberCount = this.#topicSubscriberCounts.get(topic) ?? 0;
    this.#topicSubscriberCounts.set(topic, subscriberCount + 1);
  }

  protected override onUnsubscribe<K extends keyof TestTopics>(topic: K): void {
    const subscriberCount = this.#topicSubscriberCounts.get(topic) ?? 0;
    if (subscriberCount <= 1) {
      this.#topicSubscriberCounts.delete(topic);
      return;
    }
    this.#topicSubscriberCounts.set(topic, subscriberCount - 1);
  }
}

class EmptyTopicPublishBus extends EventBus<TestTopics> {
  static createEmpty(): EmptyTopicPublishBus {
    return new EmptyTopicPublishBus();
  }
  publishFired = false;
  protected override onPublish(): void { this.publishFired = true; }
}

const runnerMap: RunnerMap = {
  'publish-delivers': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'ping');
    const payload = requireDefined(input.payload, 'payload');
    const bus = EventBus.create<TestTopics>();
    const received: string[] = [];
    bus.subscribe(topic, async (value) => { received.push(value); });

    return bus.publish(topic, payload)
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(received, expected.received);
      })
      .finally(() => bus.close());
  },

  'unsubscribe-stops': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'ping');
    const first = requireDefined(input.first, 'first');
    const second = requireDefined(input.second, 'second');
    const bus = EventBus.create<TestTopics>();
    const received: string[] = [];
    const unsub = bus.subscribe(topic, async (payload) => { received.push(payload); });

    return bus.publish(topic, first)
      .then(() => bus.drain())
      .then(() => {
        unsub();
        return bus.publish(topic, second);
      })
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(received, expected.received);
      })
      .finally(() => bus.close());
  },

  'multiple-subscribers': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'ping');
    const payload = requireDefined(input.payload, 'payload');
    const bus = EventBus.create<TestTopics>();
    const receivedA: string[] = [];
    const receivedB: string[] = [];

    bus.subscribe(topic, async (value) => { receivedA.push(value); });
    bus.subscribe(topic, async (value) => { receivedB.push(value); });

    return bus.publish(topic, payload)
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(receivedA, expected.receivedA);
        assert.deepStrictEqual(receivedB, expected.receivedB);
      })
      .finally(() => bus.close());
  },

  'topics-isolated': ({ expected, input }) => {
    const countPayload = requireDefined(input.countPayload, 'countPayload');
    const pingPayload = requireDefined(input.pingPayload, 'pingPayload');
    const bus = EventBus.create<TestTopics>();
    const pings: string[] = [];
    const counts: number[] = [];

    bus.subscribe('ping', async (payload) => { pings.push(payload); });
    bus.subscribe('count', async (payload) => { counts.push(payload); });

    return bus.publish('ping', pingPayload)
      .then(() => bus.publish('count', countPayload))
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(pings, expected.pings);
        assert.deepStrictEqual(counts, expected.counts);
      })
      .finally(() => bus.close());
  },

  'handler-signal': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'ping');
    const payload = requireDefined(input.payload, 'payload');
    const bus = EventBus.create<TestTopics>();
    let capturedSignal: AbortSignal | undefined;

    bus.subscribe(topic, (_payload, signal) => {
      capturedSignal = signal;
    });

    return bus.publish(topic, payload)
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(capturedSignal instanceof AbortSignal, expected.isAbortSignal);
        assert.deepStrictEqual(capturedSignal?.aborted, expected.aborted);
      })
      .finally(() => bus.close());
  },

  'signal-after-unsubscribe': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'ping');
    const payload = requireDefined(input.payload, 'payload');
    const bus = EventBus.create<TestTopics>();
    let capturedSignal: AbortSignal | undefined;
    const unsub = bus.subscribe(topic, (_payload, signal) => {
      capturedSignal = signal;
    });

    return bus.publish(topic, payload)
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(capturedSignal?.aborted, expected.abortedBeforeUnsubscribe);
        unsub();
        assert.deepStrictEqual(capturedSignal?.aborted, expected.abortedAfterUnsubscribe);
      })
      .finally(() => bus.close());
  },

  'signal-after-close': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'ping');
    const payload = requireDefined(input.payload, 'payload');
    const bus = EventBus.create<TestTopics>();
    let capturedSignal: AbortSignal | undefined;

    bus.subscribe(topic, (_payload, signal) => {
      capturedSignal = signal;
    });

    return bus.publish(topic, payload)
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(capturedSignal?.aborted, expected.abortedBeforeClose);
        return bus.close();
      })
      .then(() => {
        assert.deepStrictEqual(capturedSignal?.aborted, expected.abortedAfterClose);
      });
  },

  'signal-listener-cleanup': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'ping');
    const cycles = requireDefined(input.cycles, 'cycles');
    const bus = EventBus.create<TestTopics>();
    const controller = new AbortController();

    let addCount = 0;
    let removeCount = 0;
    const originalAdd = controller.signal.addEventListener.bind(controller.signal);
    const originalRemove = controller.signal.removeEventListener.bind(controller.signal);
    const wrappedAdd: AbortSignal['addEventListener'] = (...args: Parameters<AbortSignal['addEventListener']>) => {
      addCount += 1;
      originalAdd(...args);
    };
    const wrappedRemove: AbortSignal['removeEventListener'] = (...args: Parameters<AbortSignal['removeEventListener']>) => {
      removeCount += 1;
      originalRemove(...args);
    };
    controller.signal.addEventListener = wrappedAdd;
    controller.signal.removeEventListener = wrappedRemove;

    for (let i = 0; i < cycles; i += 1) {
      const unsub = bus.subscribe(topic, async () => {}, { 'signal': controller.signal });
      assert.strictEqual(addCount - removeCount, expected.addMinusRemoveAfterAdd);
      unsub();
      assert.strictEqual(addCount - removeCount, expected.addMinusRemoveAfterRemove);
    }

    return bus.close();
  },

  'subscribe-after-close': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'ping');
    const bus = EventBus.create<TestTopics>();
    return bus.close().then(() => {
      const unsub = bus.subscribe(topic, async () => {});
      assert.strictEqual(typeof unsub === 'function', expected.ok);
      unsub();
    });
  },

  'preaborted-caller-signal': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'ping');
    const payload = requireDefined(input.payload, 'payload');
    const bus = EventBus.create<TestTopics>();
    const controller = new AbortController();
    controller.abort();
    const signal = controller.signal;
    const received: string[] = [];
    bus.subscribe(topic, async (value) => {
      received.push(value);
    }, { 'signal': signal });
    return bus.publish(topic, payload)
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(received, expected.received);
      })
      .finally(() => bus.close());
  },

  'close-stops-delivery': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'ping');
    const beforeClose = requireDefined(input.beforeClose, 'beforeClose');
    const afterClose = requireDefined(input.afterClose, 'afterClose');
    const bus = EventBus.create<TestTopics>();
    const received: string[] = [];

    bus.subscribe(topic, async (payload) => { received.push(payload); });

    return bus.publish(topic, beforeClose)
      .then(() => bus.drain())
      .then(() => bus.close())
      .then(() => bus.publish(topic, afterClose))
      .then(() => flushMicrotasks())
      .then(() => {
        assert.deepStrictEqual(received, expected.received);
      });
  },

  'publish-empty-topic': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'ping');
    const payload = requireDefined(input.payload, 'payload');
    const bus = EmptyTopicPublishBus.createEmpty();
    return bus.publish(topic, payload)
      .then(() => bus.drain())
      .then(() => bus.close())
      .then(() => {
        assert.strictEqual(bus.publishFired, expected.publishFired);
      });
  },

  'on-publish': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'order:created');
    const firstId = requireDefined(input.firstId, 'firstId');
    const secondId = requireDefined(input.secondId, 'secondId');
    const bus = ObservedBus.createObserved();
    bus.subscribe(topic, async () => {});

    return bus.publish(topic, { 'id': firstId })
      .then(() => bus.publish(topic, { 'id': secondId }))
      .then(() => bus.drain())
      .then(() => {
        assert.strictEqual(bus.publishEvents.length, expected.publishCount);
        assert.deepStrictEqual(bus.publishEvents[0], { 'topic': topic, 'payload': expected.firstPayload });
      })
      .finally(() => bus.close());
  },

  'on-subscribe': ({ expected, input }) => {
    const topics = requireDefined(input.topics, 'topics').map(requireHookTopic);
    const bus = ObservedBus.createObserved();
    for (const topic of topics) {
      bus.subscribe(topic, async () => {});
    }

    return Promise.resolve().then(() => {
      assert.strictEqual(bus.subscribeEvents.length, expected.subscribeCount);
      assert.strictEqual(bus.subscribeEvents[0], expected.firstTopic);
      assert.strictEqual(bus.subscribeEvents.at(-1), expected.lastTopic);
    }).finally(() => bus.close());
  },

  'on-unsubscribe': ({ expected, input }) => {
    const topic = requireHookTopic(requireDefined(input.topic, 'topic'));
    const bus = ObservedBus.createObserved();
    const unsub = bus.subscribe(topic, async () => {});
    assert.strictEqual(bus.unsubscribeEvents.length, 0);
    unsub();
    assert.strictEqual(bus.unsubscribeEvents.length, expected.unsubscribeCount);
    assert.strictEqual(bus.unsubscribeEvents[0], expected.topic);
    return bus.close();
  },

  'async-subscription-hooks': ({ expected, input }) => {
    const hookNames = requireDefined(input.hookNames, 'hookNames');
    const unhandledRejectionsExpected = requireDefined(input.unhandledRejections, 'unhandledRejections');
    const bus = RejectingLifecycleBus.createRejecting();
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: Error): void => { unhandledRejections.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    const unsubscribe = bus.subscribe('order:created', async () => {});
    assert.strictEqual(typeof unsubscribe, 'function');
    const unsubscribeResult = unsubscribe();
    assert.strictEqual(unsubscribeResult, undefined);

    return new Promise<void>((resolve) => { setImmediate(resolve); })
      .then(() => {
        assert.deepStrictEqual(hookNames, expected.hookNames);
        assert.strictEqual(unhandledRejectionsExpected, expected.unhandledRejections);
        assert.deepStrictEqual(bus.recordingHooks.hookNames, expected.hookNames);
        assert.deepStrictEqual(bus.recordingHooks.causes, [bus.subscribeFailure, bus.unsubscribeFailure]);
        assert.strictEqual(unhandledRejections.length, expected.unhandledRejections);
      })
      .finally(() => {
        process.off('unhandledRejection', onUnhandledRejection);
        return bus.close();
      });
  },

  'async-owned-queue-hooks': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'order:created');
    const hookNames = requireDefined(input.hookNames, 'hookNames');
    const payloadId = requireDefined(input.payloadId, 'payloadId');
    const unhandledRejectionsExpected = requireDefined(input.unhandledRejections, 'unhandledRejections');
    const bus = RejectingQueueHooksBus.createRejecting();
    const received: string[] = [];
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: Error): void => { unhandledRejections.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    return Promise.resolve()
      .then(() => {
        bus.subscribe(topic, async (payload) => { received.push(payload.id); });
        return bus.publish(topic, { 'id': payloadId });
      })
      .then(() => bus.drain())
      .then(() => new Promise<void>((resolve) => { setImmediate(resolve); }))
      .then(() => {
        assert.deepStrictEqual(hookNames, expected.hookNames);
        assert.strictEqual(unhandledRejectionsExpected, expected.unhandledRejections);
        assert.deepStrictEqual(received, expected.received);
        assert.deepStrictEqual(bus.recordingHooks.hookNames, expected.hookNames);
        assert.deepStrictEqual(bus.recordingHooks.causes, [bus.enqueueFailure, bus.dequeueFailure, bus.deliverFailure]);
        assert.strictEqual(unhandledRejections.length, expected.unhandledRejections);
      })
      .finally(() => {
        process.off('unhandledRejection', onUnhandledRejection);
        return bus.close();
      });
  },

  'on-deliver': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'order:created');
    const payloadId = requireDefined(input.payloadId, 'payloadId');
    const bus = ObservedBus.createObserved();
    bus.subscribe(topic, async () => {});
    bus.subscribe(topic, async () => {});

    return bus.publish(topic, { 'id': payloadId })
      .then(() => bus.drain())
      .then(() => {
        assert.strictEqual(bus.deliverEvents.length, expected.deliverCount);
        assert.deepStrictEqual(bus.deliverEvents[0], { 'topic': topic, 'payload': expected.firstPayload });
      })
      .finally(() => bus.close());
  },

  'owned-queues-isolated': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'order:created');
    const firstId = requireDefined(input.firstId, 'firstId');
    const secondId = requireDefined(input.secondId, 'secondId');
    const first = ObservedBus.createObserved();
    const second = ObservedBus.createObserved();
    const received: string[] = [];
    const sharedHandler = async (payload: { 'id': string }): Promise<void> => {
      received.push(payload.id);
    };

    first.subscribe(topic, sharedHandler);
    second.subscribe(topic, sharedHandler);

    return Promise.all([
      first.publish(topic, { 'id': firstId }),
      second.publish(topic, { 'id': secondId })
    ])
      .then(() => Promise.all([first.drain(), second.drain()]))
      .then(() => {
        assert.deepStrictEqual(received, expected.received);
        assert.deepStrictEqual(first.enqueueEvents, [topic]);
        assert.deepStrictEqual(second.enqueueEvents, [topic]);
        assert.deepStrictEqual(first.deliverEvents, [expected.firstDeliver]);
        assert.deepStrictEqual(second.deliverEvents, [expected.secondDeliver]);
      })
      .finally(() => Promise.all([first.close(), second.close()]));
  },

  'on-handler-error': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'order:created');
    const errorMessage = requireDefined(input.errorMessage, 'errorMessage');
    const payloadId = requireDefined(input.payloadId, 'payloadId');
    const bus = ObservedBus.createObserved();
    bus.subscribe(topic, async () => { throw RuntimeError.create(errorMessage); });

    return bus.publish(topic, { 'id': payloadId })
      .then(() => bus.drain())
      .then(() => {
        assert.strictEqual(bus.handlerErrors.length, expected.handlerErrors);
        assert.strictEqual(bus.handlerErrors[0]!.topic, expected.topic);
        assert.strictEqual(requireError(bus.handlerErrors[0]!.error).message, expected.message);
      })
      .finally(() => bus.close());
  },

  'enqueue-dequeue-hooks': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'order:created');
    const payloadId = requireDefined(input.payloadId, 'payloadId');
    const bus = ObservedBus.createObserved();
    bus.subscribe(topic, async () => {});

    return bus.publish(topic, { 'id': payloadId })
      .then(() => bus.drain())
      .then(() => {
        assert.strictEqual(bus.enqueueEvents.length, expected.enqueueCount);
        assert.strictEqual(bus.enqueueEvents[0], topic);
        assert.strictEqual(bus.dequeueEvents.length, expected.dequeueCount);
        assert.strictEqual(bus.dequeueEvents[0], topic);
      })
      .finally(() => bus.close());
  },

  'on-drop-noop': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'order:created');
    const payloadId = requireDefined(input.payloadId, 'payloadId');
    const bus = ObservedBus.createObserved();
    const controller = new AbortController();
    controller.abort();
    bus.subscribe(topic, async () => {}, { 'signal': controller.signal });

    return bus.publish(topic, { 'id': payloadId })
      .then(() => {
        assert.strictEqual(bus.dropEvents.length, expected.dropCount);
      })
      .finally(() => bus.close());
  },

  'on-dispose': ({ input }) => {
    const disposeCount = requireDefined(input.disposeCount, 'disposeCount');
    const bus = ObservedBus.createObserved();
    assert.strictEqual(bus.disposeCount.length, 0);
    return bus.close().then(() => {
      assert.strictEqual(bus.disposeCount.length, disposeCount);
    });
  },

  'hook-order': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'order:created');
    const payloadId = requireDefined(input.payloadId, 'payloadId');
    const order: string[] = [];

    class OrderedBus extends EventBus<HookTopics> {
      static createOrdered(): OrderedBus {
        return new OrderedBus();
      }
      protected override onSubscribe<K extends keyof HookTopics>(_topic: K): void { order.push('subscribe'); }
      protected override onPublish<K extends keyof HookTopics>(_topic: K, _payload: HookTopics[K]): void { order.push('publish'); }
      protected override onEnqueue<K extends keyof HookTopics>(_topic: K): void { order.push('enqueue'); }
      protected override onDequeue<K extends keyof HookTopics>(_topic: K): void { order.push('dequeue'); }
      protected override onDeliver<K extends keyof HookTopics>(_topic: K, _payload: HookTopics[K]): void { order.push('deliver'); }
    }

    const bus = OrderedBus.createOrdered();
    bus.subscribe(topic, async () => {});
    return bus.publish(topic, { 'id': payloadId })
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(order, expected.order);
      })
      .finally(() => bus.close());
  },

  'pending-admission-order': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'order:created');
    const payloadId = requireDefined(input.payloadId, 'payloadId');
    const busConfig = requireDefined(input.bus, 'bus');
    const enqueueGate = Promise.withResolvers<void>();
    const enqueueStarted = Promise.withResolvers<void>();
    const overflowGate = Promise.withResolvers<void>();
    const overflowStarted = Promise.withResolvers<void>();
    const order: string[] = [];

    class PendingAdmissionBus extends EventBus<HookTopics> {
      static createPending(config?: BusQueueOptionsEntity.InputType): PendingAdmissionBus {
        return new PendingAdmissionBus(config);
      }
      protected override onPublish(): void {
        order.push('publish');
      }

      protected override async onEnqueue(): Promise<void> {
        order.push('enqueue:start');
        enqueueStarted.resolve();
        await enqueueGate.promise;
        order.push('enqueue:end');
      }

      protected override async onOverflow(): Promise<void> {
        order.push('overflow:start');
        overflowStarted.resolve();
        await overflowGate.promise;
        order.push('overflow:end');
      }

      protected override onDequeue(): void {
        order.push('dequeue');
      }

      protected override onDeliver(): void {
        order.push('deliver');
      }
    }

    const bus = PendingAdmissionBus.createPending(busConfig);
    bus.subscribe(topic, async () => { order.push('handler'); });

    const publish = bus.publish(topic, { 'id': payloadId });
    const expectedOrder = expectedStringArray(expected.order, 'order');
    return enqueueStarted.promise
      .then(() => {
        assert.deepStrictEqual(order, expectedOrder.slice(0, 2));
        enqueueGate.resolve();
        return overflowStarted.promise;
      })
      .then(() => {
        assert.deepStrictEqual(order, expectedOrder.slice(0, 4));
        overflowGate.resolve();
        return publish;
      })
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(order, expected.order);
      });
  },

  'default-hwm': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'x');
    const items = requireDefined(input.items, 'items');
    const bus = OverflowObservedBus.createObserved();
    let resolveBlock!: () => void;
    const blockFirst = new Promise<void>((resolve) => { resolveBlock = resolve; });
    let first = true;

    bus.subscribe(topic, async () => {
      if (first) {
        first = false;
        await blockFirst;
      }
    });

    const pending: Promise<void>[] = [];
    for (const item of items) {
      pending.push(bus.publish(topic, item));
    }

    return flushMicrotasks()
      .then(() => {
        assert.strictEqual(bus.overflowDepths.length, expected.overflowCount);
        resolveBlock();
        return Promise.all(pending);
      })
      .then(() => bus.drain())
      .then(() => bus.close());
  },

  'forwarded-hwm': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'x');
    const items = requireDefined(input.items, 'items');
    const busConfig = requireDefined(input.bus, 'bus');
    const bus = OverflowObservedBus.createObserved(busConfig);
    let resolveBlock!: () => void;
    const blockFirst = new Promise<void>((resolve) => { resolveBlock = resolve; });
    let first = true;

    bus.subscribe(topic, async () => {
      if (first) {
        first = false;
        await blockFirst;
      }
    });

    const pending = items.map((item) => bus.publish(topic, item));

    return flushMicrotasks()
      .then(() => {
        assert.strictEqual(bus.overflowDepths.length >= expectedNumber(expected.overflowCountAtLeast, 'overflowCountAtLeast'), true);
        resolveBlock();
        return Promise.all(pending);
      })
      .then(() => bus.drain())
      .then(() => bus.close());
  },

  'config-snapshot': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'x');
    const payload = requireDefined(input.payload, 'payload');
    const busInput = requireDefined(input.bus, 'bus');
    const mutatedBusInput = requireDefined(input.mutatedBus, 'mutatedBus');
    const config = { 'highWaterMark': requireDefined(busInput.highWaterMark, 'bus.highWaterMark') };
    const bus = OverflowObservedBus.createObserved(config);
    config.highWaterMark = requireDefined(mutatedBusInput.highWaterMark, 'mutatedBus.highWaterMark');

    const blocked = Promise.withResolvers<void>();
    bus.subscribe(topic, async () => { await blocked.promise; });

    return bus.publish(topic, payload)
      .then(() => flushMicrotasks())
      .then(() => {
        assert.strictEqual(bus.overflowDepths.length, expected.overflowCount);
        blocked.resolve();
      })
      .then(() => bus.drain())
      .then(() => bus.close());
  },

  'same-depth-no-overflow': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'x');
    const items = requireDefined(input.items, 'items');
    const bus = OverflowObservedBus.createObserved();
    let resolveBlock!: () => void;
    const blockFirst = new Promise<void>((resolve) => { resolveBlock = resolve; });
    let first = true;

    bus.subscribe(topic, async () => {
      if (first) {
        first = false;
        await blockFirst;
      }
    });

    const pending = items.map((item) => bus.publish(topic, item));

    return flushMicrotasks()
      .then(() => {
        assert.strictEqual(bus.overflowDepths.length, expected.overflowCount);
        resolveBlock();
        return Promise.all(pending);
      })
      .then(() => bus.drain())
      .then(() => bus.close());
  },

  'throwing-on-publish': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'ping');
    const errorMessage = requireDefined(input.errorMessage, 'errorMessage');
    const payload = requireDefined(input.payload, 'payload');
    const received: string[] = [];

    class ThrowingPublishBus extends EventBus<TestTopics> {
      static createThrowing(): ThrowingPublishBus {
        return new ThrowingPublishBus();
      }
      protected override onPublish(): void {
        throw RuntimeError.create(errorMessage);
      }
    }

    const bus = ThrowingPublishBus.createThrowing();
    bus.subscribe(topic, async (value) => { received.push(value); });

    return bus.publish(topic, payload)
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(received, expected.received);
      })
      .finally(() => bus.close());
  },

  'topic-entry-cleanup': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'ping');
    const bus = IntrospectableBus.createIntrospectable();
    assert.strictEqual(bus.hasTopic(topic), expected.before);
    const unsub = bus.subscribe(topic, async () => {});
    assert.strictEqual(bus.hasTopic(topic), expected.during);
    unsub();
    assert.strictEqual(bus.hasTopic(topic), expected.after);
    return bus.close();
  },

  'topic-entry-kept': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'ping');
    const bus = IntrospectableBus.createIntrospectable();
    const unsubA = bus.subscribe(topic, async () => {});
    bus.subscribe(topic, async () => {});
    unsubA();
    assert.strictEqual(bus.hasTopic(topic), expected.after);
    return bus.close();
  },

  'throwing-on-deliver': ({ expected, input }) => {
    const topic = requireTopic(input.topic, 'ping');
    const errorMessage = requireDefined(input.errorMessage, 'errorMessage');
    const payload = requireDefined(input.payload, 'payload');
    const received: string[] = [];

    class ThrowingDeliverBus extends EventBus<TestTopics> {
      static createThrowing(): ThrowingDeliverBus {
        return new ThrowingDeliverBus();
      }
      protected override onDeliver(): void {
        throw RuntimeError.create(errorMessage);
      }
    }

    const bus = ThrowingDeliverBus.createThrowing();
    bus.subscribe(topic, async (value) => { received.push(value); });

    return bus.publish(topic, payload)
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(received, expected.received);
      })
      .finally(() => bus.close());
  }
};

function runCase(scenarioCase: ScenarioCase): Promise<void> | void {
  return runnerMap[scenarioCase.shape](scenarioCase);
}

void describe('EventBus', () => {
  for (const scenarioCase of fileIntake(scenarioGroups).cases) {
    void it(scenarioCase.name, async () => {
      await runCase(scenarioCase);
    });
  }
});


interface RetryEventTopics {
  readonly 'retry:failed': { readonly 'attempt': number };
}

function acceptEventSink<TTopicMap extends object>(sink: EventSinkInterface<TTopicMap>): EventSinkInterface<TTopicMap> {
  return sink;
}

void describe('EventSinkInterface', () => {
  void it('accepts a custom sink with only publish', async () => {
    const published: string[] = [];
    const sink = acceptEventSink<RetryEventTopics>({
      async publish(topic, payload): Promise<void> {
        published.push(`${topic}:${payload.attempt}`);
      }
    });

    await sink.publish('retry:failed', { 'attempt': 2 });

    assert.deepStrictEqual(published, ['retry:failed:2']);
  });

  void it('is implemented by EventBus without requiring lifecycle capabilities', async () => {
    const bus = EventBus.create<RetryEventTopics>();
    const sink = acceptEventSink<RetryEventTopics>(bus);

    await sink.publish('retry:failed', { 'attempt': 1 });
    await bus.close();
  });
});


void describe("EventBus subscription ownership", () => {
  void it("aborting a live caller signal removes its subscription with explicit-unsubscribe semantics", async () => {
    class AbortObservedBus extends EventBus<TestTopics> {
      static createAbortObserved(): AbortObservedBus {
        return new AbortObservedBus();
      }
      unsubscribeCount = 0;

      protected override onUnsubscribe(): void {
        this.unsubscribeCount += 1;
      }
    }

    const bus = AbortObservedBus.createAbortObserved();
    const controller = new AbortController();
    const received: string[] = [];
    const unsubscribe = bus.subscribe("ping", async (payload) => {
      received.push(payload);
    }, { 'signal': controller.signal });

    controller.abort();

    assert.strictEqual(bus.unsubscribeCount, 1);
    await bus.publish("ping", "after-abort");
    await bus.drain();
    assert.deepStrictEqual(received, []);

    unsubscribe();
    assert.strictEqual(bus.unsubscribeCount, 1);
    await bus.close();
  });

  void it("keeps duplicate handler subscriptions independent", async () => {
    const bus = EventBus.create<TestTopics>();
    const received: string[] = [];
    const handler = async (payload: string): Promise<void> => {
      received.push(payload);
    };
    const unsubscribeFirst = bus.subscribe("ping", handler);
    const unsubscribeSecond = bus.subscribe("ping", handler);

    await bus.publish("ping", "first");
    await bus.drain();

    unsubscribeFirst();

    await bus.publish("ping", "second");
    await bus.drain();

    unsubscribeSecond();

    await bus.publish("ping", "third");
    await bus.drain();

    assert.deepStrictEqual(received, ["first", "first", "second"]);
    await bus.close();
  });
});
