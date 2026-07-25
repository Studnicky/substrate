import assert from 'node:assert/strict';
import {
  describe, it
} from 'node:test';

import { HookInvoker } from '@studnicky/errors';

import { EventBus } from '../../src/EventBus.js';
import type { BusQueueOptionsEntity } from '../../src/entities/BusQueueOptionsEntity.js';
import scenarioGroups from './EventBus.scenarios.json';

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

type ScenarioCase =
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'publish-delivers' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'unsubscribe-stops' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'multiple-subscribers' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'topics-isolated' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'handler-signal' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'signal-after-unsubscribe' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'signal-after-close' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'signal-listener-cleanup' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'subscribe-after-close' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'preaborted-caller-signal' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'close-stops-delivery' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'publish-empty-topic' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'on-publish' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'on-subscribe' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'on-unsubscribe' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'async-subscription-hooks' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'async-owned-queue-hooks' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'on-deliver' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'owned-queues-isolated' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'on-handler-error' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'enqueue-dequeue-hooks' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'on-drop-noop' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'on-dispose' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'hook-order' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'pending-admission-order' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'default-hwm' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'forwarded-hwm' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'config-snapshot' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'same-depth-no-overflow' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'throwing-on-publish' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'topic-entry-cleanup' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'topic-entry-kept' }
  | { description: string; expected: Record<string, unknown>; input: Record<string, unknown>; kind: 'throwing-on-deliver' };

type ScenarioKind = ScenarioCase['kind'];

type ScenarioRunner<K extends ScenarioKind> = (scenarioCase: Extract<ScenarioCase, { kind: K }>) => Promise<void> | void;

type RunnerMap = { [K in ScenarioKind]: ScenarioRunner<K> };

class ObservedBus extends EventBus<HookTopics> {
  static override create(): ObservedBus {
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
  protected override onHandlerError<K extends keyof HookTopics>(topic: K, error: unknown): void {
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

  protected override onHookError(hookName: string, cause: unknown): void {
    this.hookNames.push(hookName);
    this.causes.push(cause);
  }
}

class RejectingLifecycleBus extends EventBus<HookTopics> {
  static override create(): RejectingLifecycleBus {
    return new RejectingLifecycleBus();
  }

  readonly subscribeFailure = new Error('subscribe hook rejected');
  readonly unsubscribeFailure = new Error('unsubscribe hook rejected');
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
  static override create(): RejectingQueueHooksBus {
    return new RejectingQueueHooksBus();
  }

  readonly enqueueFailure = new Error('enqueue hook rejected');
  readonly dequeueFailure = new Error('dequeue hook rejected');
  readonly deliverFailure = new Error('deliver hook rejected');
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
  static override create(config?: BusQueueOptionsEntity.Type): OverflowObservedBus {
    return new OverflowObservedBus(config);
  }

  readonly overflowDepths: number[] = [];

  protected override onOverflow<K extends 'x'>(_topic: K, depth: number): void {
    this.overflowDepths.push(depth);
  }
}

class IntrospectableBus extends EventBus<TestTopics> {
  static override create(): IntrospectableBus {
    return new IntrospectableBus();
  }

  hasTopic(topic: keyof TestTopics): boolean {
    return this.hasTopicEntry(topic);
  }
}

const runnerMap: RunnerMap = {
  'publish-delivers': (scenarioCase) => {
    const input = scenarioCase.input as { payload: string; topic: 'ping' };
    const expected = scenarioCase.expected as { received: string[] };
    const bus = EventBus.create<TestTopics>();
    const received: string[] = [];
    bus.subscribe(input.topic, async (payload) => { received.push(payload); });

    return bus.publish(input.topic, input.payload)
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(received, expected.received);
      })
      .finally(() => bus.close());
  },

  'unsubscribe-stops': (scenarioCase) => {
    const input = scenarioCase.input as { first: string; second: string; topic: 'ping' };
    const expected = scenarioCase.expected as { received: string[] };
    const bus = EventBus.create<TestTopics>();
    const received: string[] = [];
    const unsub = bus.subscribe(input.topic, async (payload) => { received.push(payload); });

    return bus.publish(input.topic, input.first)
      .then(() => bus.drain())
      .then(() => {
        unsub();
        return bus.publish(input.topic, input.second);
      })
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(received, expected.received);
      })
      .finally(() => bus.close());
  },

  'multiple-subscribers': (scenarioCase) => {
    const input = scenarioCase.input as { payload: string; topic: 'ping' };
    const expected = scenarioCase.expected as { receivedA: string[]; receivedB: string[] };
    const bus = EventBus.create<TestTopics>();
    const receivedA: string[] = [];
    const receivedB: string[] = [];

    bus.subscribe(input.topic, async (payload) => { receivedA.push(payload); });
    bus.subscribe(input.topic, async (payload) => { receivedB.push(payload); });

    return bus.publish(input.topic, input.payload)
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(receivedA, expected.receivedA);
        assert.deepStrictEqual(receivedB, expected.receivedB);
      })
      .finally(() => bus.close());
  },

  'topics-isolated': (scenarioCase) => {
    const input = scenarioCase.input as { countPayload: number; pingPayload: string };
    const expected = scenarioCase.expected as { counts: number[]; pings: string[] };
    const bus = EventBus.create<TestTopics>();
    const pings: string[] = [];
    const counts: number[] = [];

    bus.subscribe('ping', async (payload) => { pings.push(payload); });
    bus.subscribe('count', async (payload) => { counts.push(payload); });

    return bus.publish('ping', input.pingPayload)
      .then(() => bus.publish('count', input.countPayload))
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(pings, expected.pings);
        assert.deepStrictEqual(counts, expected.counts);
      })
      .finally(() => bus.close());
  },

  'handler-signal': (scenarioCase) => {
    const expected = scenarioCase.expected as { aborted: boolean; isAbortSignal: boolean; topic: 'ping' };
    const input = scenarioCase.input as { payload: string; topic: 'ping' };
    const bus = EventBus.create<TestTopics>();
    let capturedSignal: AbortSignal | undefined;

    bus.subscribe(input.topic, (_payload, signal) => {
      capturedSignal = signal;
    });

    return bus.publish(input.topic, input.payload)
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(capturedSignal instanceof AbortSignal, expected.isAbortSignal);
        assert.deepStrictEqual(capturedSignal?.aborted, expected.aborted);
      })
      .finally(() => bus.close());
  },

  'signal-after-unsubscribe': (scenarioCase) => {
    const input = scenarioCase.input as { payload: string; topic: 'ping' };
    const expected = scenarioCase.expected as { abortedAfterUnsubscribe: boolean; abortedBeforeUnsubscribe: boolean };
    const bus = EventBus.create<TestTopics>();
    let capturedSignal: AbortSignal | undefined;
    const unsub = bus.subscribe(input.topic, (_payload, signal) => {
      capturedSignal = signal;
    });

    return bus.publish(input.topic, input.payload)
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(capturedSignal?.aborted, expected.abortedBeforeUnsubscribe);
        unsub();
        assert.deepStrictEqual(capturedSignal?.aborted, expected.abortedAfterUnsubscribe);
      })
      .finally(() => bus.close());
  },

  'signal-after-close': (scenarioCase) => {
    const input = scenarioCase.input as { payload: string; topic: 'ping' };
    const expected = scenarioCase.expected as { abortedAfterClose: boolean; abortedBeforeClose: boolean };
    const bus = EventBus.create<TestTopics>();
    let capturedSignal: AbortSignal | undefined;

    bus.subscribe(input.topic, (_payload, signal) => {
      capturedSignal = signal;
    });

    return bus.publish(input.topic, input.payload)
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(capturedSignal?.aborted, expected.abortedBeforeClose);
        return bus.close();
      })
      .then(() => {
        assert.deepStrictEqual(capturedSignal?.aborted, expected.abortedAfterClose);
      });
  },

  'signal-listener-cleanup': (scenarioCase) => {
    const input = scenarioCase.input as { cycles: number; topic: 'ping' };
    const expected = scenarioCase.expected as { addMinusRemoveAfterAdd: number; addMinusRemoveAfterRemove: number };
    const bus = EventBus.create<TestTopics>();
    const controller = new AbortController();

    let addCount = 0;
    let removeCount = 0;
    const originalAdd = controller.signal.addEventListener.bind(controller.signal);
    const originalRemove = controller.signal.removeEventListener.bind(controller.signal);
    controller.signal.addEventListener = ((...args: Parameters<typeof originalAdd>) => {
      addCount += 1;
      return originalAdd(...args);
    }) as typeof controller.signal.addEventListener;
    controller.signal.removeEventListener = ((...args: Parameters<typeof originalRemove>) => {
      removeCount += 1;
      return originalRemove(...args);
    }) as typeof controller.signal.removeEventListener;

    for (let i = 0; i < input.cycles; i += 1) {
      const unsub = bus.subscribe(input.topic, async () => {}, { 'signal': controller.signal });
      assert.strictEqual(addCount - removeCount, expected.addMinusRemoveAfterAdd);
      unsub();
      assert.strictEqual(addCount - removeCount, expected.addMinusRemoveAfterRemove);
    }

    return bus.close();
  },

  'subscribe-after-close': (scenarioCase) => {
    const input = scenarioCase.input as { topic: 'ping' };
    const expected = scenarioCase.expected as { ok: boolean };
    const bus = EventBus.create<TestTopics>();
    return bus.close().then(() => {
      const unsub = bus.subscribe(input.topic, async () => {});
      assert.strictEqual(typeof unsub === 'function', expected.ok);
      unsub();
    });
  },

  'preaborted-caller-signal': (scenarioCase) => {
    const input = scenarioCase.input as { payload: string; topic: 'ping' };
    const expected = scenarioCase.expected as { aborted: boolean; received: string[] };
    const bus = EventBus.create<TestTopics>();
    const controller = new AbortController();
    controller.abort();
    const signal = controller.signal;
    const received: string[] = [];
    bus.subscribe(input.topic, async (_payload, innerSignal) => {
      received.push(_payload);
      assert.strictEqual(innerSignal.aborted, expected.aborted);
    }, { 'signal': signal });
    return bus.publish(input.topic, input.payload)
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(received, expected.received);
      })
      .finally(() => bus.close());
  },

  'close-stops-delivery': (scenarioCase) => {
    const input = scenarioCase.input as { afterClose: string; beforeClose: string; topic: 'ping' };
    const expected = scenarioCase.expected as { received: string[] };
    const bus = EventBus.create<TestTopics>();
    const received: string[] = [];

    bus.subscribe(input.topic, async (payload) => { received.push(payload); });

    return bus.publish(input.topic, input.beforeClose)
      .then(() => bus.drain())
      .then(() => bus.close())
      .then(() => bus.publish(input.topic, input.afterClose))
      .then(() => flushMicrotasks())
      .then(() => {
        assert.deepStrictEqual(received, expected.received);
      });
  },

  'publish-empty-topic': (scenarioCase) => {
    const input = scenarioCase.input as { payload: string; topic: 'ping' };
    const expected = scenarioCase.expected as { ok: boolean };
    const bus = EventBus.create<TestTopics>();
    return bus.publish(input.topic, input.payload)
      .then(() => bus.drain())
      .then(() => bus.close())
      .then(() => {
        assert.strictEqual(expected.ok, true);
      });
  },

  'on-publish': (scenarioCase) => {
    const input = scenarioCase.input as { firstId: string; secondId: string; topic: 'order:created' };
    const expected = scenarioCase.expected as { publishCount: number; firstPayload: { id: string } };
    const bus = new ObservedBus();
    bus.subscribe(input.topic, async () => {});

    return bus.publish(input.topic, { 'id': input.firstId })
      .then(() => bus.publish(input.topic, { 'id': input.secondId }))
      .then(() => bus.drain())
      .then(() => {
        assert.strictEqual(bus.publishEvents.length, expected.publishCount);
        assert.deepStrictEqual(bus.publishEvents[0], { 'topic': input.topic, 'payload': expected.firstPayload });
      })
      .finally(() => bus.close());
  },

  'on-subscribe': (scenarioCase) => {
    const input = scenarioCase.input as { topics: Array<keyof HookTopics> };
    const expected = scenarioCase.expected as { subscribeCount: number; firstTopic: keyof HookTopics; lastTopic: keyof HookTopics };
    const bus = new ObservedBus();
    for (const topic of input.topics) {
      bus.subscribe(topic, async () => {});
    }

    return Promise.resolve().then(() => {
      assert.strictEqual(bus.subscribeEvents.length, expected.subscribeCount);
      assert.strictEqual(bus.subscribeEvents[0], expected.firstTopic);
      assert.strictEqual(bus.subscribeEvents.at(-1), expected.lastTopic);
    }).finally(() => bus.close());
  },

  'on-unsubscribe': (scenarioCase) => {
    const input = scenarioCase.input as { topic: keyof HookTopics };
    const expected = scenarioCase.expected as { unsubscribeCount: number; topic: keyof HookTopics };
    const bus = new ObservedBus();
    const unsub = bus.subscribe(input.topic, async () => {});
    assert.strictEqual(bus.unsubscribeEvents.length, 0);
    unsub();
    assert.strictEqual(bus.unsubscribeEvents.length, expected.unsubscribeCount);
    assert.strictEqual(bus.unsubscribeEvents[0], expected.topic);
    return bus.close();
  },

  'async-subscription-hooks': (scenarioCase) => {
    const input = scenarioCase.input as { hookNames: string[]; unhandledRejections: number };
    const expected = scenarioCase.expected as { hookNames: string[]; unhandledRejections: number };
    const bus = RejectingLifecycleBus.create();
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { unhandledRejections.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    const unsubscribe = bus.subscribe('order:created', async () => {});
    assert.strictEqual(typeof unsubscribe, 'function');
    const unsubscribeResult = unsubscribe();
    assert.strictEqual(unsubscribeResult, undefined);

    return new Promise<void>((resolve) => { setImmediate(resolve); })
      .then(() => {
        assert.deepStrictEqual(input.hookNames, expected.hookNames);
        assert.strictEqual(input.unhandledRejections, expected.unhandledRejections);
        assert.deepStrictEqual(bus.recordingHooks.hookNames, expected.hookNames);
        assert.deepStrictEqual(bus.recordingHooks.causes, [bus.subscribeFailure, bus.unsubscribeFailure]);
        assert.strictEqual(unhandledRejections.length, expected.unhandledRejections);
      })
      .finally(() => {
        process.off('unhandledRejection', onUnhandledRejection);
        return bus.close();
      });
  },

  'async-owned-queue-hooks': (scenarioCase) => {
    const input = scenarioCase.input as { hookNames: string[]; payloadId: string; topic: 'order:created'; unhandledRejections: number };
    const expected = scenarioCase.expected as { hookNames: string[]; received: string[]; unhandledRejections: number };
    const bus = RejectingQueueHooksBus.create();
    const received: string[] = [];
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { unhandledRejections.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    return Promise.resolve()
      .then(() => {
        bus.subscribe(input.topic, async (payload) => { received.push(payload.id); });
        return bus.publish(input.topic, { 'id': input.payloadId });
      })
      .then(() => bus.drain())
      .then(() => new Promise<void>((resolve) => { setImmediate(resolve); }))
      .then(() => {
        assert.deepStrictEqual(input.hookNames, expected.hookNames);
        assert.strictEqual(input.unhandledRejections, expected.unhandledRejections);
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

  'on-deliver': (scenarioCase) => {
    const input = scenarioCase.input as { payloadId: string; topic: 'order:created' };
    const expected = scenarioCase.expected as { deliverCount: number; firstPayload: { id: string } };
    const bus = new ObservedBus();
    bus.subscribe(input.topic, async () => {});
    bus.subscribe(input.topic, async () => {});

    return bus.publish(input.topic, { 'id': input.payloadId })
      .then(() => bus.drain())
      .then(() => {
        assert.strictEqual(bus.deliverEvents.length, expected.deliverCount);
        assert.deepStrictEqual(bus.deliverEvents[0], { 'topic': input.topic, 'payload': expected.firstPayload });
      })
      .finally(() => bus.close());
  },

  'owned-queues-isolated': (scenarioCase) => {
    const input = scenarioCase.input as { firstId: string; secondId: string; topic: 'order:created' };
    const expected = scenarioCase.expected as {
      firstDeliver: { payload: { id: string }; topic: 'order:created' };
      received: string[];
      secondDeliver: { payload: { id: string }; topic: 'order:created' };
    };
    const first = ObservedBus.create();
    const second = ObservedBus.create();
    const received: string[] = [];
    const sharedHandler = async (payload: { 'id': string }): Promise<void> => {
      received.push(payload.id);
    };

    first.subscribe(input.topic, sharedHandler);
    second.subscribe(input.topic, sharedHandler);

    return Promise.all([
      first.publish(input.topic, { 'id': input.firstId }),
      second.publish(input.topic, { 'id': input.secondId })
    ])
      .then(() => Promise.all([first.drain(), second.drain()]))
      .then(() => {
        assert.deepStrictEqual(received, expected.received);
        assert.deepStrictEqual(first.enqueueEvents, [input.topic]);
        assert.deepStrictEqual(second.enqueueEvents, [input.topic]);
        assert.deepStrictEqual(first.deliverEvents, [expected.firstDeliver]);
        assert.deepStrictEqual(second.deliverEvents, [expected.secondDeliver]);
      })
      .finally(() => Promise.all([first.close(), second.close()]));
  },

  'on-handler-error': (scenarioCase) => {
    const input = scenarioCase.input as { errorMessage: string; payloadId: string; topic: 'order:created' };
    const expected = scenarioCase.expected as { handlerErrors: number; message: string; topic: 'order:created' };
    const bus = ObservedBus.create();
    bus.subscribe(input.topic, async () => { throw new Error(input.errorMessage); });

    return bus.publish(input.topic, { 'id': input.payloadId })
      .then(() => bus.drain())
      .then(() => {
        assert.strictEqual(bus.handlerErrors.length, expected.handlerErrors);
        assert.strictEqual(bus.handlerErrors[0]!.topic, expected.topic);
        assert.strictEqual((bus.handlerErrors[0]!.error as Error).message, expected.message);
      })
      .finally(() => bus.close());
  },

  'enqueue-dequeue-hooks': (scenarioCase) => {
    const input = scenarioCase.input as { payloadId: string; topic: 'order:created' };
    const expected = scenarioCase.expected as { dequeueCount: number; enqueueCount: number };
    const bus = ObservedBus.create();
    bus.subscribe(input.topic, async () => {});

    return bus.publish(input.topic, { 'id': input.payloadId })
      .then(() => bus.drain())
      .then(() => {
        assert.strictEqual(bus.enqueueEvents.length, expected.enqueueCount);
        assert.strictEqual(bus.enqueueEvents[0], input.topic);
        assert.strictEqual(bus.dequeueEvents.length, expected.dequeueCount);
        assert.strictEqual(bus.dequeueEvents[0], input.topic);
      })
      .finally(() => bus.close());
  },

  'on-drop-noop': (scenarioCase) => {
    const input = scenarioCase.input as { topic: 'order:created' };
    const expected = scenarioCase.expected as { closed: boolean };
    const bus = ObservedBus.create();
    const unsub = bus.subscribe(input.topic, async () => {});
    unsub();
    const bus2 = ObservedBus.create();
    bus2.subscribe(input.topic, async () => {});
    return bus2.close().then(() => bus.close()).then(() => {
      assert.strictEqual(expected.closed, true);
    });
  },

  'on-dispose': (scenarioCase) => {
    const input = scenarioCase.input as { disposeCount: number };
    const bus = ObservedBus.create();
    assert.strictEqual(bus.disposeCount.length, 0);
    return bus.close().then(() => {
      assert.strictEqual(bus.disposeCount.length, input.disposeCount);
    });
  },

  'hook-order': (scenarioCase) => {
    const input = scenarioCase.input as { payloadId: string; topic: 'order:created' };
    const expected = scenarioCase.expected as { order: string[] };
    const order: string[] = [];

    class OrderedBus extends EventBus<HookTopics> {
      static override create(): OrderedBus {
        return new OrderedBus();
      }
      protected override onSubscribe<K extends keyof HookTopics>(_topic: K): void { order.push('subscribe'); }
      protected override onPublish<K extends keyof HookTopics>(_topic: K, _payload: HookTopics[K]): void { order.push('publish'); }
      protected override onEnqueue<K extends keyof HookTopics>(_topic: K): void { order.push('enqueue'); }
      protected override onDequeue<K extends keyof HookTopics>(_topic: K): void { order.push('dequeue'); }
      protected override onDeliver<K extends keyof HookTopics>(_topic: K, _payload: HookTopics[K]): void { order.push('deliver'); }
    }

    const bus = OrderedBus.create();
    bus.subscribe(input.topic, async () => {});
    return bus.publish(input.topic, { 'id': input.payloadId })
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(order, expected.order);
      })
      .finally(() => bus.close());
  },

  'pending-admission-order': (scenarioCase) => {
    const input = scenarioCase.input as { bus: { highWaterMark: number }; payloadId: string; topic: 'order:created' };
    const expected = scenarioCase.expected as { order: string[] };
    const enqueueGate = Promise.withResolvers<void>();
    const enqueueStarted = Promise.withResolvers<void>();
    const overflowGate = Promise.withResolvers<void>();
    const overflowStarted = Promise.withResolvers<void>();
    const order: string[] = [];

    class PendingAdmissionBus extends EventBus<HookTopics> {
      static override create(): PendingAdmissionBus {
        return new PendingAdmissionBus(input.bus);
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

    const bus = PendingAdmissionBus.create();
    bus.subscribe(input.topic, async () => { order.push('handler'); });

    const publish = bus.publish(input.topic, { 'id': input.payloadId });
    return enqueueStarted.promise
      .then(() => {
        assert.deepStrictEqual(order, expected.order.slice(0, 2));
        enqueueGate.resolve();
        return overflowStarted.promise;
      })
      .then(() => {
        assert.deepStrictEqual(order, expected.order.slice(0, 4));
        overflowGate.resolve();
        return publish;
      })
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(order, expected.order);
      });
  },

  'default-hwm': (scenarioCase) => {
    const input = scenarioCase.input as { items: string[]; topic: 'x' };
    const expected = scenarioCase.expected as { overflowCount: number };
    const bus = OverflowObservedBus.create();
    let resolveBlock!: () => void;
    const blockFirst = new Promise<void>((resolve) => { resolveBlock = resolve; });
    let first = true;

    bus.subscribe(input.topic, async () => {
      if (first) {
        first = false;
        await blockFirst;
      }
    });

    const pending: Promise<void>[] = [];
    for (const item of input.items) {
      pending.push(bus.publish(input.topic, item));
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

  'forwarded-hwm': (scenarioCase) => {
    const input = scenarioCase.input as { bus: { highWaterMark: number }; items: string[]; topic: 'x' };
    const expected = scenarioCase.expected as { overflowCountAtLeast: number };
    const bus = OverflowObservedBus.create(input.bus);
    let resolveBlock!: () => void;
    const blockFirst = new Promise<void>((resolve) => { resolveBlock = resolve; });
    let first = true;

    bus.subscribe(input.topic, async () => {
      if (first) {
        first = false;
        await blockFirst;
      }
    });

    const pending = input.items.map((item) => bus.publish(input.topic, item));

    return flushMicrotasks()
      .then(() => {
        assert.strictEqual(bus.overflowDepths.length >= expected.overflowCountAtLeast, true);
        resolveBlock();
        return Promise.all(pending);
      })
      .then(() => bus.drain())
      .then(() => bus.close());
  },

  'config-snapshot': (scenarioCase) => {
    const input = scenarioCase.input as { bus: { highWaterMark: number }; mutatedBus: { highWaterMark: number }; payload: string; topic: 'x' };
    const expected = scenarioCase.expected as { overflowCount: number };
    const config = { 'highWaterMark': input.bus.highWaterMark };
    const bus = OverflowObservedBus.create(config);
    config.highWaterMark = input.mutatedBus.highWaterMark;

    const blocked = Promise.withResolvers<void>();
    bus.subscribe(input.topic, async () => { await blocked.promise; });

    return bus.publish(input.topic, input.payload)
      .then(() => flushMicrotasks())
      .then(() => {
        assert.strictEqual(bus.overflowDepths.length, expected.overflowCount);
        blocked.resolve();
      })
      .then(() => bus.drain())
      .then(() => bus.close());
  },

  'same-depth-no-overflow': (scenarioCase) => {
    const input = scenarioCase.input as { items: string[]; topic: 'x' };
    const expected = scenarioCase.expected as { overflowCount: number };
    const bus = OverflowObservedBus.create();
    let resolveBlock!: () => void;
    const blockFirst = new Promise<void>((resolve) => { resolveBlock = resolve; });
    let first = true;

    bus.subscribe(input.topic, async () => {
      if (first) {
        first = false;
        await blockFirst;
      }
    });

    const pending = input.items.map((item) => bus.publish(input.topic, item));

    return flushMicrotasks()
      .then(() => {
        assert.strictEqual(bus.overflowDepths.length, expected.overflowCount);
        resolveBlock();
        return Promise.all(pending);
      })
      .then(() => bus.drain())
      .then(() => bus.close());
  },

  'throwing-on-publish': (scenarioCase) => {
    const input = scenarioCase.input as { errorMessage: string; payload: string; topic: 'ping' };
    const expected = scenarioCase.expected as { received: string[] };
    const received: string[] = [];

    class ThrowingPublishBus extends EventBus<TestTopics> {
      static override create(): ThrowingPublishBus {
        return new ThrowingPublishBus();
      }

      protected override onPublish(): void {
        throw new Error(input.errorMessage);
      }
    }

    const bus = ThrowingPublishBus.create();
    bus.subscribe(input.topic, async (payload) => { received.push(payload); });

    return bus.publish(input.topic, input.payload)
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(received, expected.received);
      })
      .finally(() => bus.close());
  },

  'topic-entry-cleanup': (scenarioCase) => {
    const input = scenarioCase.input as { topic: 'ping' };
    const expected = scenarioCase.expected as { after: boolean; before: boolean; during: boolean };
    const bus = IntrospectableBus.create();
    assert.strictEqual(bus.hasTopic(input.topic), expected.before);
    const unsub = bus.subscribe(input.topic, async () => {});
    assert.strictEqual(bus.hasTopic(input.topic), expected.during);
    unsub();
    assert.strictEqual(bus.hasTopic(input.topic), expected.after);
    return bus.close();
  },

  'topic-entry-kept': (scenarioCase) => {
    const input = scenarioCase.input as { topic: 'ping' };
    const expected = scenarioCase.expected as { after: boolean };
    const bus = IntrospectableBus.create();
    const unsubA = bus.subscribe(input.topic, async () => {});
    bus.subscribe(input.topic, async () => {});
    unsubA();
    assert.strictEqual(bus.hasTopic(input.topic), expected.after);
    return bus.close();
  },

  'throwing-on-deliver': (scenarioCase) => {
    const input = scenarioCase.input as { errorMessage: string; payload: string; topic: 'ping' };
    const expected = scenarioCase.expected as { received: string[] };
    const received: string[] = [];

    class ThrowingDeliverBus extends EventBus<TestTopics> {
      static override create(): ThrowingDeliverBus {
        return new ThrowingDeliverBus();
      }

      protected override onDeliver(): void {
        throw new Error(input.errorMessage);
      }
    }

    const bus = ThrowingDeliverBus.create();
    bus.subscribe(input.topic, async (payload) => { received.push(payload); });

    return bus.publish(input.topic, input.payload)
      .then(() => bus.drain())
      .then(() => {
        assert.deepStrictEqual(received, expected.received);
      })
      .finally(() => bus.close());
  }
};

function runCase<K extends ScenarioKind>(scenarioCase: Extract<ScenarioCase, { kind: K }>): Promise<void> | void {
  return runnerMap[scenarioCase.kind](scenarioCase);
}

void describe('EventBus', () => {
  for (const scenario of scenarioGroups.cases) {
    void it(scenario.name, async () => {
      await runCase(scenario as ScenarioCase);
    });
  }
});
