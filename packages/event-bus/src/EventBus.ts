/** Typed multi-topic pub/sub; per-subscriber BusQueue isolates errors and backpressure. */

import type { EventHandlerType } from './EventHandlerType.js';
import type { UnsubscribeType } from './UnsubscribeType.js';

import { BusQueue } from './BusQueue.js';

export class EventBus<TTopicMap extends Record<string, unknown>> {
  readonly #store = new Map<string, Map<EventHandlerType<unknown>, BusQueue<unknown>>>();
  readonly #busController = new AbortController();

  static create<TTopicMap extends Record<string, unknown>>(): EventBus<TTopicMap> {
    return new EventBus<TTopicMap>();
  }

  private constructor() {}

  #getTopicMap<K extends keyof TTopicMap>(topic: K): Map<EventHandlerType<TTopicMap[K]>, BusQueue<TTopicMap[K]>> {
    const key = String(topic);
    let topicMap = this.#store.get(key);
    if (topicMap === undefined) {
      topicMap = new Map<EventHandlerType<unknown>, BusQueue<unknown>>();
      this.#store.set(key, topicMap);
    }
    // Single cast at the typed boundary — the runtime map is keyed by string,
    // and per-K typing is enforced by the method signature above.
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

    const queue = new BusQueue<TTopicMap[K]>(
      async (payload) => { await handler(payload); },
      { 'signal': queueController.signal }
    );
    topicMap.set(handler, queue);

    let unsubscribed = false;
    return (): void => {
      if (unsubscribed) { return; }
      unsubscribed = true;
      this.#store.get(String(topic))?.delete(handler as EventHandlerType<unknown>);
      queueController.abort();
      this.#busController.signal.removeEventListener('abort', stopQueue);
    };
  }

  async publish<K extends keyof TTopicMap>(topic: K, payload: TTopicMap[K]): Promise<void> {
    const topicMap = this.#store.get(String(topic));
    if (topicMap === undefined || topicMap.size === 0) { return; }
    await Promise.all([...topicMap.values()].map((q) => q.enqueue(payload as unknown)));
  }

  async drain(): Promise<void> {
    const promises: Promise<void>[] = [];
    for (const topicMap of this.#store.values()) {
      for (const queue of topicMap.values()) { promises.push(queue.drain()); }
    }
    await Promise.all(promises);
  }

  async close(): Promise<void> {
    this.#busController.abort();
    await this.drain();
  }
}
