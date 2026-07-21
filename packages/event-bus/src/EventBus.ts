/** Typed multi-topic pub/sub; per-subscriber BusQueue isolates errors and backpressure. */

import { HookInvoker } from '@studnicky/errors';

import type { BusQueueCreateOptionsInterface } from './BusQueueCreateOptionsInterface.js';
import type { BusQueueOptionsEntity } from './entities/BusQueueOptionsEntity.js';
import type { EventHandlerInterface } from './EventHandlerInterface.js';
import type { UnsubscribeInterface } from './UnsubscribeInterface.js';

import { BusQueue } from './BusQueue.js';

/** Swallows hook failures rather than throwing — a throwing hook must not replace publish()/subscribe() or block delivery. */
class EventBusHookInvoker extends HookInvoker {
  protected override onHookError(_hookName: string, _cause: unknown): void {}
}

interface DrainableQueueInterface {
  drain(): Promise<void>;
}

export class EventBus<TTopicMap extends object> {
  static readonly #OwnedSubscriptionQueue = class EventBusSubscriptionQueue<
    TOwnerTopicMap extends object,
    TTopic extends keyof TOwnerTopicMap
  > extends BusQueue<TOwnerTopicMap[TTopic]> {
    readonly #owner: EventBus<TOwnerTopicMap>;
    readonly #topic: TTopic;

    constructor(
      owner: EventBus<TOwnerTopicMap>,
      topic: TTopic,
      options: BusQueueCreateOptionsInterface<TOwnerTopicMap[TTopic]>
    ) {
      super(options);
      this.#owner = owner;
      this.#topic = topic;
    }

    protected override onEnqueue(_depth: number): Promise<void> {
      const owner = this.#owner;
      const topic = this.#topic;
      return owner.hooks.invokeAsync('onEnqueue', () => { const result = owner.onEnqueue(topic); return result; });
    }

    protected override onDequeue(_depth: number): Promise<void> {
      const owner = this.#owner;
      const topic = this.#topic;
      return owner.hooks.invokeAsync('onDequeue', () => { const result = owner.onDequeue(topic); return result; });
    }

    protected override onDrop(): Promise<void> {
      const owner = this.#owner;
      const topic = this.#topic;
      return owner.hooks.invokeAsync('onDrop', () => { const result = owner.onDrop(topic); return result; });
    }

    protected override onOverflow(depth: number): Promise<void> {
      const owner = this.#owner;
      const topic = this.#topic;
      return owner.hooks.invokeAsync('onOverflow', () => { const result = owner.onOverflow(topic, depth); return result; });
    }

    protected override onHandlerError(error: unknown): Promise<void> {
      const owner = this.#owner;
      const topic = this.#topic;
      return owner.hooks.invokeAsync('onHandlerError', () => { const result = owner.onHandlerError(topic, error); return result; });
    }
  };

  protected readonly hooks: HookInvoker = new EventBusHookInvoker();
  readonly #store = new Map<keyof TTopicMap, unknown>();
  readonly #queues = new Set<DrainableQueueInterface>();
  readonly #busController = new AbortController();
  readonly #config: BusQueueOptionsEntity.Type;

  static create<TTopicMap extends object>(config?: BusQueueOptionsEntity.Type): EventBus<TTopicMap> {
    const result = new this<TTopicMap>(config);
    return result;
  }

  protected constructor(config?: BusQueueOptionsEntity.Type) {
    this.#config = Object.freeze(structuredClone(config ?? {}));
  }

  /** True when the topic still has a (possibly empty) entry in the internal store — exposed for subclass introspection/testing. */
  protected hasTopicEntry<K extends keyof TTopicMap>(topic: K): boolean {
    const result = this.#store.has(topic);
    return result;
  }

  #getTopicMap<K extends keyof TTopicMap>(topic: K, create: true): Map<
    EventHandlerInterface<TTopicMap[K]>, BusQueue<TTopicMap[K]>
  >;
  #getTopicMap<K extends keyof TTopicMap>(topic: K, create: false): Map<
    EventHandlerInterface<TTopicMap[K]>, BusQueue<TTopicMap[K]>
  > | undefined;
  #getTopicMap(topic: keyof TTopicMap, create: boolean): unknown {
    const existing = this.#store.get(topic);
    if (existing !== undefined || !create) {
      return existing;
    }
    const fresh = new Map<unknown, unknown>();
    this.#store.set(topic, fresh);
    return fresh;
  }

  subscribe<K extends keyof TTopicMap>(
    topic: K,
    handler: EventHandlerInterface<TTopicMap[K]>,
    options?: { 'signal'?: AbortSignal }
  ): UnsubscribeInterface {
    const topicMap = this.#getTopicMap(topic, true);

    const queueController = new AbortController();
    const stopQueue = (): void => { queueController.abort(); };

    if (this.#busController.signal.aborted) {
      queueController.abort();
    } else {
      this.#busController.signal.addEventListener('abort', stopQueue, { 'once': true });
    }

    const callerSignal = options?.signal;
    if (callerSignal !== undefined) {
      if (callerSignal.aborted) {
        queueController.abort();
      } else {
        callerSignal.addEventListener('abort', stopQueue, { 'once': true });
      }
    }

    const queueHandler = async (payload: TTopicMap[K]): Promise<void> => {
      await handler(payload, queueController.signal);
      await this.hooks.invokeAsync('onDeliver', () => {
        const result = this.onDeliver(topic, payload);
        return result;
      });
    };

    const queueOptions: BusQueueCreateOptionsInterface<TTopicMap[K]> = {
      'handler': queueHandler,
      ...(this.#config.highWaterMark !== undefined ? { 'highWaterMark': this.#config.highWaterMark } : {}),
      'signal': queueController.signal
    };
    const queue = new EventBus.#OwnedSubscriptionQueue<TTopicMap, K>(this, topic, queueOptions);
    topicMap.set(handler, queue);
    this.#queues.add(queue);
    this.hooks.invoke('onSubscribe', () => { const result = this.onSubscribe(topic); return result; });

    let unsubscribed = false;
    return (): void => {
      if (unsubscribed) { return; }
      unsubscribed = true;
      topicMap.delete(handler);
      this.#queues.delete(queue);
      if (topicMap.size === 0) { this.#store.delete(topic); }
      queueController.abort();
      this.#busController.signal.removeEventListener('abort', stopQueue);
      if (callerSignal !== undefined) {
        callerSignal.removeEventListener('abort', stopQueue);
      }
      this.hooks.invoke('onUnsubscribe', () => { const result = this.onUnsubscribe(topic); return result; });
    };
  }

  async publish<K extends keyof TTopicMap>(topic: K, payload: TTopicMap[K]): Promise<void> {
    const topicMap = this.#getTopicMap(topic, false);
    if (topicMap === undefined || topicMap.size === 0) { return; }
    await this.hooks.invokeAsync('onPublish', () => { const result = this.onPublish(topic, payload); return result; });
    await Promise.all([...topicMap.values()].map((q) => { const result = q.enqueue(payload); return result; }));
  }

  async drain(): Promise<void> {
    const promises = [...this.#queues].map(async (queue) => { await queue.drain(); });
    await Promise.all(promises);
  }

  async close(): Promise<void> {
    await this.hooks.invokeAsync('onDispose', () => { const result = this.onDispose(); return result; });
    this.#busController.abort();
    await this.drain();
  }

  /** Fires when publish() is called for a topic (once per publish, before fan-out). */
  protected onPublish<K extends keyof TTopicMap>(_topic: K, _payload: TTopicMap[K]): void | Promise<void> {}

  /** Fires when a subscriber is registered for a topic. */
  protected onSubscribe<K extends keyof TTopicMap>(_topic: K): void {}

  /** Fires when a subscriber is removed (unsubscribe fn called or signal aborted). */
  protected onUnsubscribe<K extends keyof TTopicMap>(_topic: K): void {}

  /** Fires after each individual event delivery to a handler (per-queue, per-event). */
  protected onDeliver<K extends keyof TTopicMap>(_topic: K, _payload: TTopicMap[K]): void | Promise<void> {}

  /** Fires when a subscriber handler throws an error. */
  protected onHandlerError<K extends keyof TTopicMap>(_topic: K, _error: unknown): void | Promise<void> {}

  /** Fires when the bus is closed (bus.close() called). */
  protected onDispose(): void | Promise<void> {}

  /** Fires when an event is enqueued to a subscriber queue. */
  protected onEnqueue<K extends keyof TTopicMap>(_topic: K): void | Promise<void> {}

  /** Fires when an event is dequeued from a subscriber queue for delivery. */
  protected onDequeue<K extends keyof TTopicMap>(_topic: K): void | Promise<void> {}

  /** Fires when an event is dropped (queue aborted / subscriber gone). */
  protected onDrop<K extends keyof TTopicMap>(_topic: K): void | Promise<void> {}

  /** Fires when overflow/backpressure begins on a subscriber queue. */
  protected onOverflow<K extends keyof TTopicMap>(_topic: K, _depth: number): void | Promise<void> {}
}
