/** String-keyed fan-in async generator inbox; one active subscriber per key. */

import { CircularBuffer } from '@studnicky/circular-buffer';
import { HookInvoker, RuntimeError } from '@studnicky/errors';
import { Predicates } from '@studnicky/types';

import type { ChannelEntryStateEntity } from './entities/ChannelEntryStateEntity.js';
import type { ChannelOptionsEntity } from './entities/ChannelOptionsEntity.js';
import type { ChannelKeyStateInterface } from './interfaces/ChannelKeyStateInterface.js';

import { ChannelKeyMachine } from './ChannelKeyMachine.js';
import { ChannelError } from './errors/ChannelError.js';

interface ChannelEntryInterface<T> {
  'cancelled': ChannelEntryStateEntity.Type['cancelled'];
  readonly 'item': T;
  readonly 'settle': () => void;
  readonly 'settled': Promise<void>;
}

interface ChannelStateInterface<T> {
  readonly 'buffer': CircularBuffer<ChannelEntryInterface<T>>;
  'notify': (() => void) | null;
  'state': ChannelKeyStateInterface;
}

class ChannelVariantGuards {
  public static isClosedVariant(variant: ChannelKeyStateInterface['variant']): boolean {
    const result = variant === 'closed-idle' || variant === 'closed-subscribed';
    return result;
  }

  public static isSubscribedVariant(variant: ChannelKeyStateInterface['variant']): boolean {
    const result = variant === 'open-subscribed' || variant === 'closed-subscribed';
    return result;
  }
}

interface ChannelSubclassInterface<TInstance> extends Function {
  readonly 'prototype': TInstance;
}

class ChannelInstance {
  static belongsTo<TInstance>(
    constructor: ChannelSubclassInterface<TInstance>,
    value: object
  ): value is object & TInstance {
    const result = value instanceof constructor;
    return result;
  }
}

// T only appears in Channel's covariant/contravariant members (publish/subscribe),
// so a bound of `Channel<T>` would force `Channel<T>` (the method's own general T)
// to satisfy `Channel<never>`/`Channel<any>`, which either fails to typecheck or
// requires a banned `any`. `close()` is the one public member that doesn't
// mention T at all, so it constrains TInstance to "is actually Channel-shaped"
// without hitting that wall.
interface ChannelShapeInterface {
  close(): Promise<void>;
}

export class Channel<T> {
  static create<
    T,
    TInstance extends ChannelShapeInterface = Channel<T>
  >(
    this: ChannelSubclassInterface<TInstance>,
    options?: ChannelOptionsEntity.Type
  ): TInstance {
    const getCurrentConstructor = (): ChannelSubclassInterface<TInstance> => { return this; };
    const currentConstructor = getCurrentConstructor();

    const result: unknown = Reflect.construct(currentConstructor, [options]);
    if (!Predicates.isObjectLike(result) || !ChannelInstance.belongsTo(currentConstructor, result)) {
      throw RuntimeError.create('Channel.create() did not construct the requested subclass.');
    }
    const instance: TInstance = result;
    return instance;
  }

  protected readonly hooks: HookInvoker = new HookInvoker();
  #closed = false;
  readonly #channels = new Map<string, ChannelStateInterface<T>>();
  readonly #highWaterMark: number | undefined;
  readonly #keyMachine = new ChannelKeyMachine();

  protected constructor(options?: ChannelOptionsEntity.Type) {
    this.#highWaterMark = options?.highWaterMark;
  }

  async close(): Promise<void> {
    this.#closed = true;
    for (const ch of this.#channels.values()) {
      ch.state = this.#keyMachine.transition(ch.state, { 'type': 'close' }).state;
      if (ch.notify !== null) {
        const notify = ch.notify;
        ch.notify = null;
        notify();
      }
    }
    await this.hooks.invokeAsync('onClose', () => { const result = this.onClose(); return result; });
  }

  async publish(key: string, item: T): Promise<void> {
    if (this.#closed) {
      await this.hooks.invokeAsync('onPublishDropped', () => { const result = this.onPublishDropped(key, item); return result; });
      return;
    }
    const ch = this.#getOrCreate(key);
    const readiness = Promise.withResolvers<void>();
    const entry: ChannelEntryInterface<T> = {
      'cancelled': false,
      'item': item,
      'settle': readiness.resolve,
      'settled': readiness.promise
    };
    ch.buffer.push(entry);
    const depth = ch.buffer.length;
    try {
      await this.hooks.invokeAsync('onEnqueue', () => { const result = this.onEnqueue(key, item); return result; });
      if (this.#highWaterMark !== undefined && depth >= this.#highWaterMark) {
        await this.hooks.invokeAsync('onOverflow', () => { const result = this.onOverflow(key, depth); return result; });
      }
    } catch (error) {
      entry.cancelled = true;
      throw error;
    } finally {
      entry.settle();
      if (ch.notify !== null) {
        const notify = ch.notify;
        ch.notify = null;
        notify();
      }
    }
  }

  async *subscribe(key: string): AsyncGenerator<T> {
    const ch = this.#getOrCreate(key);
    if (ChannelVariantGuards.isSubscribedVariant(ch.state.variant)) {
      throw new ChannelError(key);
    }
    if (this.#closed) { ch.state = this.#keyMachine.transition(ch.state, { 'type': 'close' }).state; }
    ch.state = this.#keyMachine.transition(ch.state, { 'type': 'subscribe' }).state;

    try {
      while (true) {
        const entry = ch.buffer.shift();
        if (entry !== undefined) {
          await entry.settled;
          if (entry.cancelled) {
            continue;
          }
          const item = entry.item;
          await this.#invokeOnDequeue(key, item);
          yield item;
          continue;
        }
        if (ChannelVariantGuards.isClosedVariant(ch.state.variant)) { return; }
        await this.#awaitNotify(ch);
      }
    } finally {
      ch.state = this.#keyMachine.transition(ch.state, { 'type': 'unsubscribe' }).state;
      // The channel-level close() has fired and this key's buffer is fully
      // drained (the only ways out of the loop above with ch.state closed —
      // no further publish() or subscribe() can ever be useful for this key,
      // so the per-key entry is safe to evict.
      if (ChannelVariantGuards.isClosedVariant(ch.state.variant) && this.#channels.get(key) === ch) {
        this.#channels.delete(key);
      }
    }
  }

  /** Number of per-key entries currently tracked. Exposed for subclass diagnostics/tests. */
  protected get channelCount(): number {
    const result = this.#channels.size;
    return result;
  }

  #getOrCreate(key: string): ChannelStateInterface<T> {
    const existing = this.#channels.get(key);
    if (existing !== undefined) { return existing; }
    const fresh: ChannelStateInterface<T> = {
      'buffer': CircularBuffer.create<ChannelEntryInterface<T>>({ 'overflow': 'grow' }),
      'notify': null,
      'state': this.#keyMachine.getInitialState()
    };
    this.#channels.set(key, fresh);
    return fresh;
  }

  async #invokeOnDequeue(key: string, item: T): Promise<void> {
    await this.hooks.invokeAsync('onDequeue', () => { const result = this.onDequeue(key, item); return result; });
  }

  async #awaitNotify(ch: ChannelStateInterface<T>): Promise<void> {
    await new Promise<void>((resolve) => { ch.notify = resolve; });
  }

  /**
   * Fires after publish() stages an item in the per-key buffer. A failure
   * cancels the staged item and rejects publish().
   */
  protected onEnqueue(_key: string, _item: T): void {}

  /**
   * Fires in subscribe() right after buffer.shift() succeeds — item dequeued.
   * A failure rejects the subscriber after the item is removed.
   */
  protected onDequeue(_key: string, _item: T): void {}

  /**
   * Fires in publish() when #closed is true (item silently dropped).
   * A failure rejects publish() after the item is dropped.
   */
  protected onPublishDropped(_key: string, _item: T): void {}

  /**
   * Fires in close(), after closing and notifying all keys.
   * A failure rejects close() after the channel is closed.
   */
  protected onClose(): void {}

  /**
   * Fires in publish() when a highWaterMark is configured and the per-key buffer
   * depth is at or above it, after the item is staged in the buffer. Successful
   * observation leaves delivery unchanged; a failure cancels the staged item
   * and rejects publish(). Never fires when highWaterMark is left unconfigured.
   */
  protected onOverflow(_key: string, _depth: number): void {}
}
