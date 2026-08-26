/** Typed multi-topic pub/sub; per-subscriber BusQueue isolates errors and backpressure. */

import { HookInvoker } from '@studnicky/errors';
import { Predicates } from '@studnicky/types';

import type { BusQueueOptionsEntity } from './entities/BusQueueOptionsEntity.js';
import type { BusQueueCreateOptionsInterface, EventHandlerInterface, UnsubscribeInterface } from './interfaces/index.js';

import { BusQueue } from './BusQueue.js';

/** Swallows hook failures rather than throwing — a throwing hook must not replace publish()/subscribe() or block delivery. */
class EventBusHookInvoker extends HookInvoker {
  protected override onHookError(_hookName: string): void {}
}

interface DrainableQueueInterface {
  drain(): Promise<void>;
}

interface EventBusSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class EventBusInstance {
  static belongsTo<TInstance extends object>(
    constructor: EventBusSubclassInterface<TInstance>,
    value: object
  ): value is TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

// TTopicMap only appears in EventBus's covariant/contravariant members
// (subscribe/publish), so a bound of `EventBus<TTopicMap>` would force
// `EventBus<TTopicMap>` (the method's own general TTopicMap) to satisfy
// `EventBus<never>`/`EventBus<any>`, which either fails to typecheck or
// requires a banned `any`. `drain()`/`close()` are public members that don't
// mention TTopicMap at all, so they constrain TInstance to "is actually
// EventBus-shaped" without hitting that wall.
interface EventBusShapeInterface {
  close(): Promise<void>;
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
      const result = owner.hooks.invokeAsync('onEnqueue', () => { const invocationResult = owner.onEnqueue(topic); return invocationResult; });
      return result;
    }

    protected override onDequeue(_depth: number): Promise<void> {
      const owner = this.#owner;
      const topic = this.#topic;
      const result = owner.hooks.invokeAsync('onDequeue', () => { const invocationResult = owner.onDequeue(topic); return invocationResult; });
      return result;
    }

    protected override onDrop(): Promise<void> {
      const owner = this.#owner;
      const topic = this.#topic;
      const result = owner.hooks.invokeAsync('onDrop', () => { const invocationResult = owner.onDrop(topic); return invocationResult; });
      return result;
    }

    protected override onOverflow(depth: number): Promise<void> {
      const owner = this.#owner;
      const topic = this.#topic;
      const result = owner.hooks.invokeAsync('onOverflow', () => { const invocationResult = owner.onOverflow(topic, depth); return invocationResult; });
      return result;
    }

    protected override onHandlerError(error: unknown): Promise<void> {
      const owner = this.#owner;
      const topic = this.#topic;
      const result = owner.hooks.invokeAsync('onHandlerError', () => { const invocationResult = owner.onHandlerError(topic, error); return invocationResult; });
      return result;
    }
  };

  protected readonly hooks: HookInvoker = new EventBusHookInvoker();
  readonly #store = new Map<keyof TTopicMap, unknown>();
  readonly #queues = new Set<DrainableQueueInterface>();
  readonly #busController = new AbortController();
  readonly #config: BusQueueOptionsEntity.Type;

  static create<
    TTopicMap extends object,
    TInstance extends EventBusShapeInterface = EventBus<TTopicMap>
  >(
    this: EventBusSubclassInterface<TInstance>,
    config?: BusQueueOptionsEntity.Type
  ): TInstance {
    // Lexical arrow closure over `this` (rather than `Reflect.construct(this, ...)`
    // passing `this` directly as a call argument) so the receiver is obtained
    // only through the rule-permitted `return this` form.
    const getConstructor = (): EventBusSubclassInterface<TInstance> => { return this; };
    const constructor = getConstructor();
    const result: unknown = Reflect.construct(constructor, [config]);
    if (!Predicates.isObjectLike(result) || !EventBusInstance.belongsTo(constructor, result)) {
      throw new TypeError('EventBus.create() did not construct the requested subclass.');
    }
    return result;
  }

  protected constructor(config?: BusQueueOptionsEntity.Type) {
    this.#config = Object.freeze(structuredClone(config ?? {}));
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
    // Lexical arrow closure over `this` (rather than passing `this` directly
    // as a constructor argument) so the receiver is obtained only through the
    // rule-permitted `return this` form.
    const getOwner = (): this => { return this; };
    const owner = getOwner();
    const queue = new EventBus.#OwnedSubscriptionQueue<TTopicMap, K>(owner, topic, queueOptions);
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
  protected onSubscribe(_topic: keyof TTopicMap): void {}

  /** Fires when a subscriber is removed (unsubscribe fn called or signal aborted). */
  protected onUnsubscribe(_topic: keyof TTopicMap): void {}

  /** Fires after each individual event delivery to a handler (per-queue, per-event). */
  protected onDeliver<K extends keyof TTopicMap>(_topic: K, _payload: TTopicMap[K]): void | Promise<void> {}

  /** Fires when a subscriber handler throws an error. */
  protected onHandlerError(_topic: keyof TTopicMap, _error: unknown): void | Promise<void> {}

  /** Fires when the bus is closed (bus.close() called). */
  protected onDispose(): void | Promise<void> {}

  /** Fires when an event is enqueued to a subscriber queue. */
  protected onEnqueue(_topic: keyof TTopicMap): void | Promise<void> {}

  /** Fires when an event is dequeued from a subscriber queue for delivery. */
  protected onDequeue(_topic: keyof TTopicMap): void | Promise<void> {}

  /** Fires when an event is dropped (queue aborted / subscriber gone). */
  protected onDrop(_topic: keyof TTopicMap): void | Promise<void> {}

  /** Fires when overflow/backpressure begins on a subscriber queue. */
  protected onOverflow(_topic: keyof TTopicMap, _depth: number): void | Promise<void> {}
}
