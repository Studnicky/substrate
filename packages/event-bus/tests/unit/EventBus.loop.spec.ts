import type { ScenarioCaseOfType } from '@studnicky/scenario-kit/types';

import { HookInvoker, RuntimeError } from '@studnicky/errors/node';
import { ScenarioSuite, ScenarioValues } from '@studnicky/scenario-kit/node';
import assert from 'node:assert/strict';
import { getEventListeners } from 'node:events';
import { it } from 'node:test';

import type { BusQueueOptionsEntity } from '../../src/entities/BusQueueOptionsEntity.js';
import type { EventSinkInterface } from '../../src/interfaces/index.js';
import type { HookTopicsEntity } from './entities/HookTopicsEntity.js';
import type { RetryEventTopicsEntity } from './entities/RetryEventTopicsEntity.js';
import type { TestTopicsEntity } from './entities/TestTopicsEntity.js';

import { EventBus } from '../../src/EventBus.js';
import { EventBusScenarioCaseEntity } from './entities/EventBusScenarioCaseEntity.js';
import scenarioGroups from './EventBus.scenarios.json' with { 'type': 'json' };

class ObservedBus extends EventBus<HookTopicsEntity.Type> {
  static createObserved(): ObservedBus {
    return new ObservedBus();
  }
  readonly publishEvents: { 'payload': HookTopicsEntity.Type[keyof HookTopicsEntity.Type]; 'topic': keyof HookTopicsEntity.Type; }[] = [];
  readonly subscribeEvents: (keyof HookTopicsEntity.Type)[] = [];
  readonly unsubscribeEvents: (keyof HookTopicsEntity.Type)[] = [];
  readonly deliverEvents: { 'payload': HookTopicsEntity.Type[keyof HookTopicsEntity.Type]; 'topic': keyof HookTopicsEntity.Type; }[] = [];
  readonly handlerErrors: { 'error': unknown; 'topic': keyof HookTopicsEntity.Type; }[] = [];
  readonly enqueueEvents: (keyof HookTopicsEntity.Type)[] = [];
  readonly dequeueEvents: (keyof HookTopicsEntity.Type)[] = [];
  readonly dropEvents: (keyof HookTopicsEntity.Type)[] = [];
  readonly disposeCount: number[] = [];

  protected override onPublish(topic: keyof HookTopicsEntity.Type, payload: HookTopicsEntity.Type[keyof HookTopicsEntity.Type]): void {
    this.publishEvents.push({ 'payload': payload, 'topic': topic });
  }
  protected override onSubscribe(topic: keyof HookTopicsEntity.Type): void {
    this.subscribeEvents.push(topic);
  }
  protected override onUnsubscribe(topic: keyof HookTopicsEntity.Type): void {
    this.unsubscribeEvents.push(topic);
  }
  protected override onDeliver(topic: keyof HookTopicsEntity.Type, payload: HookTopicsEntity.Type[keyof HookTopicsEntity.Type]): void {
    this.deliverEvents.push({ 'payload': payload, 'topic': topic });
  }
  protected override onHandlerError(topic: keyof HookTopicsEntity.Type, error: unknown): void {
    this.handlerErrors.push({ 'error': error, 'topic': topic });
  }
  protected override onEnqueue(topic: keyof HookTopicsEntity.Type): void {
    this.enqueueEvents.push(topic);
  }
  protected override onDequeue(topic: keyof HookTopicsEntity.Type): void {
    this.dequeueEvents.push(topic);
  }
  protected override onDrop(topic: keyof HookTopicsEntity.Type): void {
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

class RejectingLifecycleBus extends EventBus<HookTopicsEntity.Type> {
  static createRejecting(): RejectingLifecycleBus {
    return new RejectingLifecycleBus();
  }
  readonly subscribeFailure = RuntimeError.create('subscribe hook rejected');
  readonly unsubscribeFailure = RuntimeError.create('unsubscribe hook rejected');
  readonly recordingHooks = new RecordingHookInvoker();
  protected override readonly hooks = this.recordingHooks;

  protected override onSubscribe(): unknown {
    const rejection = Promise.reject(this.subscribeFailure);
    return rejection;
  }

  protected override onUnsubscribe(): unknown {
    const rejection = Promise.reject(this.unsubscribeFailure);
    return rejection;
  }
}

class RejectingQueueHooksBus extends EventBus<HookTopicsEntity.Type> {
  static createRejecting(): RejectingQueueHooksBus {
    return new RejectingQueueHooksBus();
  }
  readonly enqueueFailure = RuntimeError.create('enqueue hook rejected');
  readonly dequeueFailure = RuntimeError.create('dequeue hook rejected');
  readonly deliverFailure = RuntimeError.create('deliver hook rejected');
  readonly recordingHooks = new RecordingHookInvoker();
  protected override readonly hooks = this.recordingHooks;

  protected override onEnqueue(): Promise<void> {
    const rejection = Promise.reject(this.enqueueFailure);
    return rejection;
  }

  protected override onDequeue(): Promise<void> {
    const rejection = Promise.reject(this.dequeueFailure);
    return rejection;
  }

  protected override onDeliver(): Promise<void> {
    const rejection = Promise.reject(this.deliverFailure);
    return rejection;
  }
}

class OverflowObservedBus extends EventBus<{ 'x': string }> {
  static createObserved(config?: BusQueueOptionsEntity.InputType): OverflowObservedBus {
    return new OverflowObservedBus(config);
  }
  readonly overflowDepths: number[] = [];

  protected override onOverflow(_topic: 'x', depth: number): void {
    this.overflowDepths.push(depth);
  }
}

class IntrospectableBus extends EventBus<TestTopicsEntity.Type> {
  static createIntrospectable(): IntrospectableBus {
    return new IntrospectableBus();
  }
  readonly #topicSubscriberCounts = new Map<keyof TestTopicsEntity.Type, number>();

  hasTopic(topic: keyof TestTopicsEntity.Type): boolean {
    const subscriberCount = this.#topicSubscriberCounts.get(topic) ?? 0;
    const hasSubscribers = subscriberCount > 0;
    return hasSubscribers;
  }

  protected override onSubscribe(topic: keyof TestTopicsEntity.Type): void {
    const subscriberCount = this.#topicSubscriberCounts.get(topic) ?? 0;
    this.#topicSubscriberCounts.set(topic, subscriberCount + 1);
  }

  protected override onUnsubscribe(topic: keyof TestTopicsEntity.Type): void {
    const subscriberCount = this.#topicSubscriberCounts.get(topic) ?? 0;
    if (subscriberCount > 1) {
      this.#topicSubscriberCounts.set(topic, subscriberCount - 1);
    } else {
      this.#topicSubscriberCounts.delete(topic);
    }
  }
}

class EmptyTopicPublishBus extends EventBus<TestTopicsEntity.Type> {
  static createEmpty(): EmptyTopicPublishBus {
    return new EmptyTopicPublishBus();
  }
  publishFired = false;
  protected override onPublish(): void { this.publishFired = true; }
}

class EventBusRunners {
  static async 'async-owned-queue-hooks'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'async-owned-queue-hooks'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'order:created');
    const hookNames = ScenarioValues.requireDefined(input.hookNames, 'hookNames');
    const payloadId = ScenarioValues.requireDefined(input.payloadId, 'payloadId');
    const unhandledRejectionsExpected = ScenarioValues.requireDefined(input.unhandledRejections, 'unhandledRejections');
    const bus = RejectingQueueHooksBus.createRejecting();
    const received: string[] = [];
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { unhandledRejections.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      bus.subscribe(topic, (payload) => { received.push(payload.id); });
      await bus.publish(topic, { 'id': payloadId });
      await bus.drain();
      await new Promise<void>((resolve) => { setImmediate(resolve); });
      assert.deepStrictEqual(hookNames, expected.hookNames);
      assert.strictEqual(unhandledRejectionsExpected, expected.unhandledRejections);
      assert.deepStrictEqual(received, expected.received);
      assert.deepStrictEqual(bus.recordingHooks.hookNames, expected.hookNames);
      assert.deepStrictEqual(bus.recordingHooks.causes, [bus.enqueueFailure, bus.dequeueFailure, bus.deliverFailure]);
      assert.strictEqual(unhandledRejections.length, expected.unhandledRejections);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
      await bus.close();
    }
  }

  static async 'async-subscription-hooks'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'async-subscription-hooks'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const hookNames = ScenarioValues.requireDefined(input.hookNames, 'hookNames');
    const unhandledRejectionsExpected = ScenarioValues.requireDefined(input.unhandledRejections, 'unhandledRejections');
    const bus = RejectingLifecycleBus.createRejecting();
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown): void => { unhandledRejections.push(reason); };
    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const unsubscribe = bus.subscribe('order:created', () => {});
      assert.strictEqual(typeof unsubscribe, 'function');
      const unsubscribeResult = unsubscribe();
      assert.strictEqual(unsubscribeResult, undefined);

      await new Promise<void>((resolve) => { setImmediate(resolve); });
      assert.deepStrictEqual(hookNames, expected.hookNames);
      assert.strictEqual(unhandledRejectionsExpected, expected.unhandledRejections);
      assert.deepStrictEqual(bus.recordingHooks.hookNames, expected.hookNames);
      assert.deepStrictEqual(bus.recordingHooks.causes, [bus.subscribeFailure, bus.unsubscribeFailure]);
      assert.strictEqual(unhandledRejections.length, expected.unhandledRejections);
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
      await bus.close();
    }
  }

  static async 'close-stops-delivery'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'close-stops-delivery'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'ping');
    const beforeClose = ScenarioValues.requireDefined(input.beforeClose, 'beforeClose');
    const afterClose = ScenarioValues.requireDefined(input.afterClose, 'afterClose');
    const bus = EventBus.create<TestTopicsEntity.Type>();
    const received: string[] = [];

    bus.subscribe(topic, (payload) => { received.push(payload); });

    await bus.publish(topic, beforeClose);
    await bus.drain();
    await bus.close();
    await bus.publish(topic, afterClose);
    await EventBusRunners.flushMicrotasks();
    assert.deepStrictEqual(received, expected.received);
  }

  static async 'config-snapshot'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'config-snapshot'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'x');
    const payload = ScenarioValues.requireDefined(input.payload, 'payload');
    const busInput = ScenarioValues.requireDefined(input.bus, 'bus');
    const mutatedBusInput = ScenarioValues.requireDefined(input.mutatedBus, 'mutatedBus');
    const config = { 'highWaterMark': ScenarioValues.requireDefined(busInput.highWaterMark, 'bus.highWaterMark') };
    const bus = OverflowObservedBus.createObserved(config);
    config.highWaterMark = ScenarioValues.requireDefined(mutatedBusInput.highWaterMark, 'mutatedBus.highWaterMark');

    const blocked = Promise.withResolvers<void>();
    bus.subscribe(topic, async () => { await blocked.promise; });

    await bus.publish(topic, payload);
    await EventBusRunners.flushMicrotasks();
    assert.strictEqual(bus.overflowDepths.length, expected.overflowCount);
    blocked.resolve();
    await bus.drain();
    await bus.close();
  }

  static async 'default-hwm'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'default-hwm'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'x');
    const items = ScenarioValues.requireDefined(input.items, 'items');
    const bus = OverflowObservedBus.createObserved();
    const blockFirst = Promise.withResolvers<void>();
    let first = true;

    bus.subscribe(topic, async () => {
      if (first) {
        first = false;
        await blockFirst.promise;
      }
    });

    const pending: Promise<void>[] = [];
    const itemCount = items.length;
    for (let itemIndex = 0; itemIndex < itemCount; itemIndex += 1) {
      pending.push(bus.publish(topic, ScenarioValues.requireDefined(items[itemIndex], `items[${itemIndex}]`)));
    }

    await EventBusRunners.flushMicrotasks();
    assert.strictEqual(bus.overflowDepths.length, expected.overflowCount);
    blockFirst.resolve();
    await Promise.all(pending);
    await bus.drain();
    await bus.close();
  }

  static async 'enqueue-dequeue-hooks'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'enqueue-dequeue-hooks'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'order:created');
    const payloadId = ScenarioValues.requireDefined(input.payloadId, 'payloadId');
    const bus = ObservedBus.createObserved();
    bus.subscribe(topic, () => {});

    try {
      await bus.publish(topic, { 'id': payloadId });
      await bus.drain();
      assert.strictEqual(bus.enqueueEvents.length, expected.enqueueCount);
      assert.strictEqual(bus.enqueueEvents[0], topic);
      assert.strictEqual(bus.dequeueEvents.length, expected.dequeueCount);
      assert.strictEqual(bus.dequeueEvents[0], topic);
    } finally {
      await bus.close();
    }
  }

  static async 'forwarded-hwm'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'forwarded-hwm'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'x');
    const items = ScenarioValues.requireDefined(input.items, 'items');
    const busConfig = ScenarioValues.requireDefined(input.bus, 'bus');
    const bus = OverflowObservedBus.createObserved(busConfig);
    const blockFirst = Promise.withResolvers<void>();
    let first = true;

    bus.subscribe(topic, async () => {
      if (first) {
        first = false;
        await blockFirst.promise;
      }
    });

    const pending = items.map((item) => {
      const publication = bus.publish(topic, item);
      return publication;
    });

    await EventBusRunners.flushMicrotasks();
    assert.strictEqual(bus.overflowDepths.length >= ScenarioValues.requireNumber(expected.overflowCountAtLeast, 'expected.overflowCountAtLeast'), true);
    blockFirst.resolve();
    await Promise.all(pending);
    await bus.drain();
    await bus.close();
  }

  static async 'handler-signal'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'handler-signal'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'ping');
    const payload = ScenarioValues.requireDefined(input.payload, 'payload');
    const bus = EventBus.create<TestTopicsEntity.Type>();
    let capturedSignal: AbortSignal | undefined;

    bus.subscribe(topic, (_payload, signal) => {
      capturedSignal = signal;
    });

    try {
      await bus.publish(topic, payload);
      await bus.drain();
      assert.deepStrictEqual(capturedSignal instanceof AbortSignal, expected.isAbortSignal);
      assert.deepStrictEqual(capturedSignal?.aborted, expected.aborted);
    } finally {
      await bus.close();
    }
  }

  static async 'hook-order'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'hook-order'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'order:created');
    const payloadId = ScenarioValues.requireDefined(input.payloadId, 'payloadId');
    const order: string[] = [];

    class OrderedBus extends EventBus<HookTopicsEntity.Type> {
      static createOrdered(): OrderedBus {
        return new OrderedBus();
      }
      protected override onSubscribe(): void { order.push('subscribe'); }
      protected override onPublish(): void { order.push('publish'); }
      protected override onEnqueue(): void { order.push('enqueue'); }
      protected override onDequeue(): void { order.push('dequeue'); }
      protected override onDeliver(): void { order.push('deliver'); }
    }

    const bus = OrderedBus.createOrdered();
    bus.subscribe(topic, () => {});
    try {
      await bus.publish(topic, { 'id': payloadId });
      await bus.drain();
      assert.deepStrictEqual(order, expected.order);
    } finally {
      await bus.close();
    }
  }

  static async 'multiple-subscribers'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'multiple-subscribers'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'ping');
    const payload = ScenarioValues.requireDefined(input.payload, 'payload');
    const bus = EventBus.create<TestTopicsEntity.Type>();
    const receivedA: string[] = [];
    const receivedB: string[] = [];

    bus.subscribe(topic, (value) => { receivedA.push(value); });
    bus.subscribe(topic, (value) => { receivedB.push(value); });

    try {
      await bus.publish(topic, payload);
      await bus.drain();
      assert.deepStrictEqual(receivedA, expected.receivedA);
      assert.deepStrictEqual(receivedB, expected.receivedB);
    } finally {
      await bus.close();
    }
  }

  static async 'on-deliver'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'on-deliver'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'order:created');
    const payloadId = ScenarioValues.requireDefined(input.payloadId, 'payloadId');
    const bus = ObservedBus.createObserved();
    bus.subscribe(topic, () => {});
    bus.subscribe(topic, () => {});

    try {
      await bus.publish(topic, { 'id': payloadId });
      await bus.drain();
      assert.strictEqual(bus.deliverEvents.length, expected.deliverCount);
      assert.deepStrictEqual(bus.deliverEvents[0], { 'payload': expected.firstPayload, 'topic': topic });
    } finally {
      await bus.close();
    }
  }

  static async 'on-dispose'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'on-dispose'>): Promise<void> {
    const { input } = scenarioCase;
    const disposeCount = ScenarioValues.requireDefined(input.disposeCount, 'disposeCount');
    const bus = ObservedBus.createObserved();
    assert.strictEqual(bus.disposeCount.length, 0);
    await bus.close();
    assert.strictEqual(bus.disposeCount.length, disposeCount);
  }

  static async 'on-drop-noop'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'on-drop-noop'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'order:created');
    const payloadId = ScenarioValues.requireDefined(input.payloadId, 'payloadId');
    const bus = ObservedBus.createObserved();
    const controller = new AbortController();
    controller.abort(RuntimeError.create('caller aborted before subscribing'));
    bus.subscribe(topic, () => {}, { 'signal': controller.signal });

    try {
      await bus.publish(topic, { 'id': payloadId });
      assert.strictEqual(bus.dropEvents.length, expected.dropCount);
    } finally {
      await bus.close();
    }
  }

  static async 'on-handler-error'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'on-handler-error'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'order:created');
    const errorMessage = ScenarioValues.requireDefined(input.errorMessage, 'errorMessage');
    const payloadId = ScenarioValues.requireDefined(input.payloadId, 'payloadId');
    const bus = ObservedBus.createObserved();
    bus.subscribe(topic, () => { throw RuntimeError.create(errorMessage); });

    try {
      await bus.publish(topic, { 'id': payloadId });
      await bus.drain();
      const handlerError = ScenarioValues.requireDefined(bus.handlerErrors[0], 'handlerErrors[0]');
      assert.strictEqual(bus.handlerErrors.length, expected.handlerErrors);
      assert.strictEqual(handlerError.topic, expected.topic);
      assert.strictEqual(EventBusRunners.requireError(handlerError.error).message, expected.message);
    } finally {
      await bus.close();
    }
  }

  static async 'on-publish'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'on-publish'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'order:created');
    const firstId = ScenarioValues.requireDefined(input.firstId, 'firstId');
    const secondId = ScenarioValues.requireDefined(input.secondId, 'secondId');
    const bus = ObservedBus.createObserved();
    bus.subscribe(topic, () => {});

    try {
      await bus.publish(topic, { 'id': firstId });
      await bus.publish(topic, { 'id': secondId });
      await bus.drain();
      assert.strictEqual(bus.publishEvents.length, expected.publishCount);
      assert.deepStrictEqual(bus.publishEvents[0], { 'payload': expected.firstPayload, 'topic': topic });
    } finally {
      await bus.close();
    }
  }

  static async 'on-subscribe'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'on-subscribe'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topics = ScenarioValues.requireDefined(input.topics, 'topics').map((topic: string) => {
      const hookTopic = EventBusRunners.requireHookTopic(topic);
      return hookTopic;
    });
    const bus = ObservedBus.createObserved();
    const topicCount = topics.length;
    for (let topicIndex = 0; topicIndex < topicCount; topicIndex += 1) {
      bus.subscribe(ScenarioValues.requireDefined(topics[topicIndex], `topics[${topicIndex}]`), () => {});
    }

    try {
      assert.strictEqual(bus.subscribeEvents.length, expected.subscribeCount);
      assert.strictEqual(bus.subscribeEvents[0], expected.firstTopic);
      assert.strictEqual(bus.subscribeEvents.at(-1), expected.lastTopic);
    } finally {
      await bus.close();
    }
  }

  static async 'on-unsubscribe'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'on-unsubscribe'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireHookTopic(ScenarioValues.requireDefined(input.topic, 'topic'));
    const bus = ObservedBus.createObserved();
    const unsubscribe = bus.subscribe(topic, () => {});
    assert.strictEqual(bus.unsubscribeEvents.length, 0);
    unsubscribe();
    assert.strictEqual(bus.unsubscribeEvents.length, expected.unsubscribeCount);
    assert.strictEqual(bus.unsubscribeEvents[0], expected.topic);
    await bus.close();
  }

  static async 'owned-queues-isolated'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'owned-queues-isolated'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'order:created');
    const firstId = ScenarioValues.requireDefined(input.firstId, 'firstId');
    const secondId = ScenarioValues.requireDefined(input.secondId, 'secondId');
    const first = ObservedBus.createObserved();
    const second = ObservedBus.createObserved();
    const received: string[] = [];
    const sharedHandler = (payload: HookTopicsEntity.Type['order:created']): void => {
      received.push(payload.id);
    };

    first.subscribe(topic, sharedHandler);
    second.subscribe(topic, sharedHandler);

    try {
      await Promise.all([
        first.publish(topic, { 'id': firstId }),
        second.publish(topic, { 'id': secondId })
      ]);
      await Promise.all([first.drain(), second.drain()]);
      assert.deepStrictEqual(received, expected.received);
      assert.deepStrictEqual(first.enqueueEvents, [topic]);
      assert.deepStrictEqual(second.enqueueEvents, [topic]);
      assert.deepStrictEqual(first.deliverEvents, [expected.firstDeliver]);
      assert.deepStrictEqual(second.deliverEvents, [expected.secondDeliver]);
    } finally {
      await Promise.all([first.close(), second.close()]);
    }
  }

  static async 'pending-admission-order'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'pending-admission-order'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'order:created');
    const payloadId = ScenarioValues.requireDefined(input.payloadId, 'payloadId');
    const busConfig = ScenarioValues.requireDefined(input.bus, 'bus');
    const enqueueGate = Promise.withResolvers<void>();
    const enqueueStarted = Promise.withResolvers<void>();
    const overflowGate = Promise.withResolvers<void>();
    const overflowStarted = Promise.withResolvers<void>();
    const order: string[] = [];

    class PendingAdmissionBus extends EventBus<HookTopicsEntity.Type> {
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
    bus.subscribe(topic, () => { order.push('handler'); });

    const publish = bus.publish(topic, { 'id': payloadId });
    const expectedOrder = ScenarioValues.requireStringArray(expected.order, 'expected.order');
    await enqueueStarted.promise;
    assert.deepStrictEqual(order, expectedOrder.slice(0, 2));
    enqueueGate.resolve();
    await overflowStarted.promise;
    assert.deepStrictEqual(order, expectedOrder.slice(0, 4));
    overflowGate.resolve();
    await publish;
    await bus.drain();
    assert.deepStrictEqual(order, expected.order);
  }

  static async 'preaborted-caller-signal'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'preaborted-caller-signal'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'ping');
    const payload = ScenarioValues.requireDefined(input.payload, 'payload');
    const bus = EventBus.create<TestTopicsEntity.Type>();
    const controller = new AbortController();
    controller.abort(RuntimeError.create('caller aborted before subscribing'));
    const signal = controller.signal;
    const received: string[] = [];
    bus.subscribe(topic, (value) => {
      received.push(value);
    }, { 'signal': signal });
    try {
      await bus.publish(topic, payload);
      await bus.drain();
      assert.deepStrictEqual(received, expected.received);
    } finally {
      await bus.close();
    }
  }

  static async 'publish-delivers'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'publish-delivers'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'ping');
    const payload = ScenarioValues.requireDefined(input.payload, 'payload');
    const bus = EventBus.create<TestTopicsEntity.Type>();
    const received: string[] = [];
    bus.subscribe(topic, (value) => { received.push(value); });

    try {
      await bus.publish(topic, payload);
      await bus.drain();
      assert.deepStrictEqual(received, expected.received);
    } finally {
      await bus.close();
    }
  }

  static async 'publish-empty-topic'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'publish-empty-topic'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'ping');
    const payload = ScenarioValues.requireDefined(input.payload, 'payload');
    const bus = EmptyTopicPublishBus.createEmpty();
    await bus.publish(topic, payload);
    await bus.drain();
    await bus.close();
    assert.strictEqual(bus.publishFired, expected.publishFired);
  }

  static async 'same-depth-no-overflow'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'same-depth-no-overflow'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'x');
    const items = ScenarioValues.requireDefined(input.items, 'items');
    const bus = OverflowObservedBus.createObserved();
    const blockFirst = Promise.withResolvers<void>();
    let first = true;

    bus.subscribe(topic, async () => {
      if (first) {
        first = false;
        await blockFirst.promise;
      }
    });

    const pending = items.map((item) => {
      const publication = bus.publish(topic, item);
      return publication;
    });

    await EventBusRunners.flushMicrotasks();
    assert.strictEqual(bus.overflowDepths.length, expected.overflowCount);
    blockFirst.resolve();
    await Promise.all(pending);
    await bus.drain();
    await bus.close();
  }

  static async 'signal-after-close'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'signal-after-close'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'ping');
    const payload = ScenarioValues.requireDefined(input.payload, 'payload');
    const bus = EventBus.create<TestTopicsEntity.Type>();
    let capturedSignal: AbortSignal | undefined;

    bus.subscribe(topic, (_payload, signal) => {
      capturedSignal = signal;
    });

    await bus.publish(topic, payload);
    await bus.drain();
    assert.deepStrictEqual(capturedSignal?.aborted, expected.abortedBeforeClose);
    await bus.close();
    assert.deepStrictEqual(capturedSignal?.aborted, expected.abortedAfterClose);
  }

  static async 'signal-after-unsubscribe'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'signal-after-unsubscribe'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'ping');
    const payload = ScenarioValues.requireDefined(input.payload, 'payload');
    const bus = EventBus.create<TestTopicsEntity.Type>();
    let capturedSignal: AbortSignal | undefined;
    const unsubscribe = bus.subscribe(topic, (_payload, signal) => {
      capturedSignal = signal;
    });

    try {
      await bus.publish(topic, payload);
      await bus.drain();
      assert.deepStrictEqual(capturedSignal?.aborted, expected.abortedBeforeUnsubscribe);
      unsubscribe();
      assert.deepStrictEqual(capturedSignal?.aborted, expected.abortedAfterUnsubscribe);
    } finally {
      await bus.close();
    }
  }

  static async 'signal-listener-cleanup'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'signal-listener-cleanup'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'ping');
    const cycles = ScenarioValues.requireDefined(input.cycles, 'cycles');
    const bus = EventBus.create<TestTopicsEntity.Type>();
    const controller = new AbortController();

    for (let cycle = 0; cycle < cycles; cycle += 1) {
      const unsubscribe = bus.subscribe(topic, () => {}, { 'signal': controller.signal });
      assert.strictEqual(getEventListeners(controller.signal, 'abort').length, expected.addMinusRemoveAfterAdd);
      unsubscribe();
      assert.strictEqual(getEventListeners(controller.signal, 'abort').length, expected.addMinusRemoveAfterRemove);
    }

    await bus.close();
  }

  static async 'subscribe-after-close'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'subscribe-after-close'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'ping');
    const bus = EventBus.create<TestTopicsEntity.Type>();
    await bus.close();
    const unsubscribe = bus.subscribe(topic, () => {});
    assert.strictEqual(typeof unsubscribe === 'function', expected.ok);
    unsubscribe();
  }

  static async 'throwing-on-deliver'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'throwing-on-deliver'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'ping');
    const errorMessage = ScenarioValues.requireDefined(input.errorMessage, 'errorMessage');
    const payload = ScenarioValues.requireDefined(input.payload, 'payload');
    const received: string[] = [];

    class ThrowingDeliverBus extends EventBus<TestTopicsEntity.Type> {
      static createThrowing(): ThrowingDeliverBus {
        return new ThrowingDeliverBus();
      }
      protected override onDeliver(): void {
        throw RuntimeError.create(errorMessage);
      }
    }

    const bus = ThrowingDeliverBus.createThrowing();
    bus.subscribe(topic, (value) => { received.push(value); });

    try {
      await bus.publish(topic, payload);
      await bus.drain();
      assert.deepStrictEqual(received, expected.received);
    } finally {
      await bus.close();
    }
  }

  static async 'throwing-on-publish'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'throwing-on-publish'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'ping');
    const errorMessage = ScenarioValues.requireDefined(input.errorMessage, 'errorMessage');
    const payload = ScenarioValues.requireDefined(input.payload, 'payload');
    const received: string[] = [];

    class ThrowingPublishBus extends EventBus<TestTopicsEntity.Type> {
      static createThrowing(): ThrowingPublishBus {
        return new ThrowingPublishBus();
      }
      protected override onPublish(): void {
        throw RuntimeError.create(errorMessage);
      }
    }

    const bus = ThrowingPublishBus.createThrowing();
    bus.subscribe(topic, (value) => { received.push(value); });

    try {
      await bus.publish(topic, payload);
      await bus.drain();
      assert.deepStrictEqual(received, expected.received);
    } finally {
      await bus.close();
    }
  }

  static async 'topic-entry-cleanup'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'topic-entry-cleanup'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'ping');
    const bus = IntrospectableBus.createIntrospectable();
    assert.strictEqual(bus.hasTopic(topic), expected.before);
    const unsubscribe = bus.subscribe(topic, () => {});
    assert.strictEqual(bus.hasTopic(topic), expected.during);
    unsubscribe();
    assert.strictEqual(bus.hasTopic(topic), expected.after);
    await bus.close();
  }

  static async 'topic-entry-kept'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'topic-entry-kept'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'ping');
    const bus = IntrospectableBus.createIntrospectable();
    const unsubscribeFirst = bus.subscribe(topic, () => {});
    bus.subscribe(topic, () => {});
    unsubscribeFirst();
    assert.strictEqual(bus.hasTopic(topic), expected.after);
    await bus.close();
  }

  static async 'topics-isolated'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'topics-isolated'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const countPayload = ScenarioValues.requireDefined(input.countPayload, 'countPayload');
    const pingPayload = ScenarioValues.requireDefined(input.pingPayload, 'pingPayload');
    const bus = EventBus.create<TestTopicsEntity.Type>();
    const pings: string[] = [];
    const counts: number[] = [];

    bus.subscribe('ping', (payload) => { pings.push(payload); });
    bus.subscribe('count', (payload) => { counts.push(payload); });

    try {
      await bus.publish('ping', pingPayload);
      await bus.publish('count', countPayload);
      await bus.drain();
      assert.deepStrictEqual(pings, expected.pings);
      assert.deepStrictEqual(counts, expected.counts);
    } finally {
      await bus.close();
    }
  }

  static async 'unsubscribe-stops'(scenarioCase: ScenarioCaseOfType<EventBusScenarioCaseEntity.Type, 'unsubscribe-stops'>): Promise<void> {
    const { expected, input } = scenarioCase;
    const topic = EventBusRunners.requireTopic(input.topic, 'ping');
    const first = ScenarioValues.requireDefined(input.first, 'first');
    const second = ScenarioValues.requireDefined(input.second, 'second');
    const bus = EventBus.create<TestTopicsEntity.Type>();
    const received: string[] = [];
    const unsubscribe = bus.subscribe(topic, (payload) => { received.push(payload); });

    try {
      await bus.publish(topic, first);
      await bus.drain();
      unsubscribe();
      await bus.publish(topic, second);
      await bus.drain();
      assert.deepStrictEqual(received, expected.received);
    } finally {
      await bus.close();
    }
  }

  static declaresExtraTests(): void {
    EventBusRunners.declaresEventSinkInterface();
    EventBusRunners.declaresBusSubscriptionOwnership();
  }

  private static declaresEventSinkInterface(): void {
    void it('accepts a custom sink with only publish', async () => {
      const published: string[] = [];
      const sink: EventSinkInterface<RetryEventTopicsEntity.Type> = {
        'publish': (topic, payload): Promise<void> => {
          published.push(`${topic}:${payload.attempt}`);
          const completion = Promise.resolve();
          return completion;
        }
      };

      await sink.publish('retry:failed', { 'attempt': 2 });

      assert.deepStrictEqual(published, ['retry:failed:2']);
    });

    void it('is implemented by EventBus without requiring lifecycle capabilities', async () => {
      const bus = EventBus.create<RetryEventTopicsEntity.Type>();
      const sink: EventSinkInterface<RetryEventTopicsEntity.Type> = bus;

      await sink.publish('retry:failed', { 'attempt': 1 });
      await bus.close();
    });
  }

  private static declaresBusSubscriptionOwnership(): void {
    void it('aborting a live caller signal removes its subscription with explicit-unsubscribe semantics', async () => {
      class AbortObservedBus extends EventBus<TestTopicsEntity.Type> {
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
      const unsubscribe = bus.subscribe('ping', (payload) => {
        received.push(payload);
      }, { 'signal': controller.signal });

      controller.abort(RuntimeError.create('caller aborted a live subscription'));

      assert.strictEqual(bus.unsubscribeCount, 1);
      await bus.publish('ping', 'after-abort');
      await bus.drain();
      assert.deepStrictEqual(received, []);

      unsubscribe();
      assert.strictEqual(bus.unsubscribeCount, 1);
      await bus.close();
    });

    void it('keeps duplicate handler subscriptions independent', async () => {
      const bus = EventBus.create<TestTopicsEntity.Type>();
      const received: string[] = [];
      const handler = (payload: string): void => {
        received.push(payload);
      };
      const unsubscribeFirst = bus.subscribe('ping', handler);
      const unsubscribeSecond = bus.subscribe('ping', handler);

      await bus.publish('ping', 'first');
      await bus.drain();

      unsubscribeFirst();

      await bus.publish('ping', 'second');
      await bus.drain();

      unsubscribeSecond();

      await bus.publish('ping', 'third');
      await bus.drain();

      assert.deepStrictEqual(received, ['first', 'first', 'second']);
      await bus.close();
    });
  }

  private static async flushMicrotasks(times = 20): Promise<void> {
    for (let tick = 0; tick < times; tick += 1) {
      await Promise.resolve();
    }
  }

  private static requireError(value: unknown): Error {
    if (value instanceof Error) {
      return value;
    }
    throw RuntimeError.create('Expected an Error instance');
  }

  private static requireTopic<TTopic extends string>(topic: string | undefined, expected: TTopic): TTopic {
    if (topic === expected) {
      return expected;
    }
    throw RuntimeError.create(`Expected topic ${expected}, received ${String(topic)}`);
  }

  private static requireHookTopic(topic: string): keyof HookTopicsEntity.Type {
    if (topic === 'order:created' || topic === 'order:updated') {
      return topic;
    }
    throw RuntimeError.create(`Unknown hook topic: ${topic}`);
  }
}

ScenarioSuite.register({
  'entity': EventBusScenarioCaseEntity,
  'extraTests': EventBusRunners.declaresExtraTests,
  'file': scenarioGroups,
  'name': 'EventBus',
  'runners': EventBusRunners
});
