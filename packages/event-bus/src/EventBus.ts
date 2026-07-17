/** Typed multi-topic pub/sub; per-subscriber BusQueue isolates errors and backpressure. */

import { HookInvoker } from '@studnicky/errors';

import type { BusQueueOptionsEntity } from './entities/BusQueueOptionsEntity.js';
import type { EventHandlerType } from './EventHandlerType.js';
import type { UnsubscribeType } from './UnsubscribeType.js';

import { BusQueue } from './BusQueue.js';
import { EventBusBuilder } from './EventBusBuilder.js';

/** Swallows hook failures rather than throwing — a throwing hook must not replace publish()/subscribe() or block delivery. */
class SwallowingHookInvoker extends HookInvoker {
  protected override onHookError<T>(_hookName: string, _cause: unknown): T {
    const result = undefined as T;
    return result;
  }
}

export class EventBus<TTopicMap extends Record<string, unknown>> {
  protected readonly hooks: HookInvoker = new SwallowingHookInvoker();
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

  /** True when the topic still has a (possibly empty) entry in the internal store — exposed for subclass introspection/testing. */
  protected hasTopicEntry<K extends keyof TTopicMap>(topic: K): boolean {
    const result = this.#store.has(String(topic));
    return result;
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

    const queueHandler = async (payload: TTopicMap[K]): Promise<void> => {
      await handler(payload, queueController.signal);
      await this.#fireDeliver(topic, payload);
    };

    const onEnqueue = (): Promise<void> => { const result = this.#fireEnqueue(topic); return result; };
    const onDequeue = (): Promise<void> => { const result = this.#fireDequeue(topic); return result; };
    const onDrop = (): Promise<void> => { const result = this.#fireDrop(topic); return result; };
    const onOverflow = (depth: number): Promise<void> => { const result = this.#fireOverflow(topic, depth); return result; };
    const onHandlerError = (err: unknown): Promise<void> => { const result = this.#fireHandlerError(topic, err); return result; };

    class SubscriptionQueue extends BusQueue<TTopicMap[K]> {
      protected override onEnqueue(_depth: number): Promise<void> {
        const result = onEnqueue();
        return result;
      }
      protected override onDequeue(_depth: number): Promise<void> {
        const result = onDequeue();
        return result;
      }
      protected override onDrop(): Promise<void> {
        const result = onDrop();
        return result;
      }
      protected override onOverflow(depth: number): Promise<void> {
        const result = onOverflow(depth);
        return result;
      }
      protected override onHandlerError(err: unknown): Promise<void> {
        const result = onHandlerError(err);
        return result;
      }
    }

    const queue = SubscriptionQueue.create({
      'handler': queueHandler,
      ...(this.#config.highWaterMark !== undefined ? { 'highWaterMark': this.#config.highWaterMark } : {}),
      'signal': queueController.signal
    });
    topicMap.set(handler, queue);
    this.#invokeHookSync('onSubscribe', () => { this.onSubscribe(topic); });

    let unsubscribed = false;
    return (): void => {
      if (unsubscribed) { return; }
      unsubscribed = true;
      const key = String(topic);
      const map = this.#store.get(key);
      map?.delete(handler as EventHandlerType<unknown>);
      if (map?.size === 0) { this.#store.delete(key); }
      queueController.abort();
      this.#busController.signal.removeEventListener('abort', stopQueue);
      if (callerSignal !== undefined) {
        callerSignal.removeEventListener('abort', stopQueue);
      }
      this.#invokeHookSync('onUnsubscribe', () => { this.onUnsubscribe(topic); });
    };
  }

  async publish<K extends keyof TTopicMap>(topic: K, payload: TTopicMap[K]): Promise<void> {
    const topicMap = this.#store.get(String(topic));
    if (topicMap === undefined || topicMap.size === 0) { return; }
    await this.hooks.invoke('onPublish', () => { const result = this.onPublish(topic, payload); return result; });
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
    await this.hooks.invoke('onDispose', () => { const result = this.onDispose(); return result; });
    this.#busController.abort();
    await this.drain();
  }

  async #fireEnqueue<K extends keyof TTopicMap>(topic: K): Promise<void> {
    await this.hooks.invoke('onEnqueue', () => { const result = this.onEnqueue(topic); return result; });
  }

  async #fireDequeue<K extends keyof TTopicMap>(topic: K): Promise<void> {
    await this.hooks.invoke('onDequeue', () => { const result = this.onDequeue(topic); return result; });
  }

  async #fireDrop<K extends keyof TTopicMap>(topic: K): Promise<void> {
    await this.hooks.invoke('onDrop', () => { const result = this.onDrop(topic); return result; });
  }

  async #fireOverflow<K extends keyof TTopicMap>(topic: K, depth: number): Promise<void> {
    await this.hooks.invoke('onOverflow', () => { const result = this.onOverflow(topic, depth); return result; });
  }

  async #fireHandlerError<K extends keyof TTopicMap>(topic: K, err: unknown): Promise<void> {
    await this.hooks.invoke('onHandlerError', () => { const result = this.onHandlerError(topic, err); return result; });
  }

  async #fireDeliver<K extends keyof TTopicMap>(topic: K, payload: TTopicMap[K]): Promise<void> {
    await this.hooks.invoke('onDeliver', () => { const result = this.onDeliver(topic, payload); return result; });
  }

  /**
   * onSubscribe/onUnsubscribe fire from subscribe() and the unsubscribe closure it
   * returns, both of which are synchronous public APIs (UnsubscribeType is `() => void`,
   * and subscribe() must hand back the unsubscribe fn immediately, not a Promise).
   * HookInvoker.invoke is always-async, so it cannot be used here without
   * breaking that contract — these two hooks keep the old swallow-on-throw behavior.
   */
  #invokeHookSync(_hookName: string, hook: () => void): void {
    try {
      hook();
    } catch {}
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
