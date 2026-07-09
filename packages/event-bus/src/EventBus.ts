/** Typed multi-topic pub/sub; per-subscriber BusQueue isolates errors and backpressure. */

import type { BusQueueOptionsEntity } from './entities/BusQueueOptionsEntity.js';
import type { EventHandlerType } from './EventHandlerType.js';
import type { UnsubscribeType } from './UnsubscribeType.js';

import { BusQueue } from './BusQueue.js';
import { EventBusBuilder } from './EventBusBuilder.js';

export class EventBus<TTopicMap extends Record<string, unknown>> {
  readonly #store = new Map<string, Map<EventHandlerType<unknown>, BusQueue<unknown>>>();
  readonly #busController = new AbortController();
  readonly #config: BusQueueOptionsEntity.Type;

  static builder<TTopicMap extends Record<string, unknown>>(): EventBusBuilder<TTopicMap> {
    const result = EventBusBuilder.create<TTopicMap>((config) => {
      const instance = EventBus.create<TTopicMap>(config);
      return instance;
    });
    return result;
  }

  static create<TTopicMap extends Record<string, unknown>>(config?: BusQueueOptionsEntity.Type): EventBus<TTopicMap> {
    const result = new this<TTopicMap>(config);
    return result;
  }

  protected constructor(config?: BusQueueOptionsEntity.Type) {
    this.#config = config ?? {};
  }

  #getTopicMap<K extends keyof TTopicMap>(topic: K): Map<EventHandlerType<TTopicMap[K]>, BusQueue<TTopicMap[K]>> {
    const key = String(topic);
    let topicMap = this.#store.get(key);
    if (topicMap === undefined) {
      topicMap = new Map<EventHandlerType<unknown>, BusQueue<unknown>>();
      this.#store.set(key, topicMap);
    }
    return topicMap as Map<EventHandlerType<TTopicMap[K]>, BusQueue<TTopicMap[K]>>;
  }

  #createQueueConfig<K extends keyof TTopicMap>(
    topic: K,
    handler: EventHandlerType<TTopicMap[K]>,
    queueController: AbortController
  ): {
    'handler': (payload: TTopicMap[K]) => Promise<void>;
    'onDequeue': (depth: number) => void;
    'onDrop': () => void;
    'onEnqueue': (depth: number) => void;
    'onHandlerError': (err: unknown) => void;
    'onOverflow': (depth: number) => void;
    'onSlowConsumer': (depth: number, hwm: number) => void;
  } {
    const queueHandler = async (payload: TTopicMap[K]): Promise<void> => {
      await handler(payload, queueController.signal);
      this.#invokeHook(() => { this.onDeliver(topic, payload); });
    };

    const queueDequeue = (_depth: number): void => { this.#invokeHook(() => { this.onDequeue(topic); }); };
    const queueDrop = (): void => { this.#invokeHook(() => { this.onDrop(topic); }); };
    const queueEnqueue = (_depth: number): void => { this.#invokeHook(() => { this.onEnqueue(topic); }); };
    const queueHandlerError = (err: unknown): void => { this.#invokeHook(() => { this.onHandlerError(topic, err); }); };
    const queueOverflow = (depth: number): void => { this.#invokeHook(() => { this.onOverflow(topic, depth); }); };
    const queueSlowConsumer = (depth: number, _hwm: number): void => { this.#invokeHook(() => { this.onSlowConsumer(topic, depth); }); };

    return {
      'handler': queueHandler,
      'onDequeue': queueDequeue,
      'onDrop': queueDrop,
      'onEnqueue': queueEnqueue,
      'onHandlerError': queueHandlerError,
      'onOverflow': queueOverflow,
      'onSlowConsumer': queueSlowConsumer
    };
  }

  subscribe<K extends keyof TTopicMap>(
    topic: K,
    handler: EventHandlerType<TTopicMap[K]>,
    options?: { 'signal'?: AbortSignal }
  ): UnsubscribeType {
    const topicMap = this.#getTopicMap(topic);

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

    const callbackConfig = this.#createQueueConfig(topic, handler, queueController);
    const queue = BusQueue.create<TTopicMap[K]>({
      ...callbackConfig,
      ...(this.#config.highWaterMark !== undefined ? { 'highWaterMark': this.#config.highWaterMark } : {}),
      'signal': queueController.signal
    });
    topicMap.set(handler, queue);
    this.#invokeHook(() => { this.onSubscribe(topic); });

    let unsubscribed = false;
    return (): void => {
      if (unsubscribed) { return; }
      unsubscribed = true;
      this.#store.get(String(topic))?.delete(handler as EventHandlerType<unknown>);
      queueController.abort();
      this.#busController.signal.removeEventListener('abort', stopQueue);
      this.#invokeHook(() => { this.onUnsubscribe(topic); });
    };
  }

  async publish<K extends keyof TTopicMap>(topic: K, payload: TTopicMap[K]): Promise<void> {
    const topicMap = this.#store.get(String(topic));
    if (topicMap === undefined || topicMap.size === 0) { return; }
    this.#invokeHook(() => { this.onPublish(topic, payload); });
    await Promise.all([...topicMap.values()].map((q) => { const result = q.enqueue(payload); return result; }));
  }

  async drain(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const topicMap of this.#store.values()) {
      for (const queue of topicMap.values()) { promises.push(queue.drain()); }
    }
    await Promise.all(promises);
  }

  async close(): Promise<void> {
    this.#invokeHook(() => { this.onDispose(); });
    this.#busController.abort();
    await this.drain();
  }

  #invokeHook(hook: () => void): void {
    try {
      hook();
    } catch {}
  }

  /** Fires when publish() is called for a topic (once per publish, before fan-out). */
  protected onPublish<K extends keyof TTopicMap>(_topic: K, _payload: TTopicMap[K]): void {}

  /** Fires when a subscriber is registered for a topic. */
  protected onSubscribe<K extends keyof TTopicMap>(_topic: K): void {}

  /** Fires when a subscriber is removed (unsubscribe fn called or signal aborted). */
  protected onUnsubscribe<K extends keyof TTopicMap>(_topic: K): void {}

  /** Fires after each individual event delivery to a handler (per-queue, per-event). */
  protected onDeliver<K extends keyof TTopicMap>(_topic: K, _payload: TTopicMap[K]): void {}

  /** Fires when a subscriber queue is at or above highWaterMark (backpressure). */
  protected onSlowConsumer<K extends keyof TTopicMap>(_topic: K, _depth: number): void {}

  /** Fires when a subscriber handler throws an error. */
  protected onHandlerError<K extends keyof TTopicMap>(_topic: K, _error: unknown): void {}

  /** Fires when the bus is closed (bus.close() called). */
  protected onDispose(): void {}

  /** Fires when an event is enqueued to a subscriber queue. */
  protected onEnqueue<K extends keyof TTopicMap>(_topic: K): void {}

  /** Fires when an event is dequeued from a subscriber queue for delivery. */
  protected onDequeue<K extends keyof TTopicMap>(_topic: K): void {}

  /** Fires when an event is dropped (queue aborted / subscriber gone). */
  protected onDrop<K extends keyof TTopicMap>(_topic: K): void {}

  /** Fires when overflow/backpressure begins on a subscriber queue. */
  protected onOverflow<K extends keyof TTopicMap>(_topic: K, _depth: number): void {}
}
