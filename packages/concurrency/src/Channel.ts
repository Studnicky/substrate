/** String-keyed fan-in async generator inbox; one active subscriber per key. */

import { CircularBuffer } from '@studnicky/circular-buffer';
import { HookInvoker } from '@studnicky/errors';

import type { ChannelEntryStateEntity } from './entities/ChannelEntryStateEntity.js';
import type { ChannelOptionsEntity } from './entities/ChannelOptionsEntity.js';
import type { ChannelStateEntity } from './entities/ChannelStateEntity.js';

import { ChannelError } from './errors/ChannelError.js';

interface ChannelEntryInterface<T> {
  'cancelled': ChannelEntryStateEntity.Type['cancelled'];
  readonly 'item': T;
  readonly 'settle': () => void;
  readonly 'settled': Promise<void>;
}

interface ChannelStateInterface<T> {
  readonly 'buffer': CircularBuffer<ChannelEntryInterface<T>>;
  'closed': ChannelStateEntity.Type['closed'];
  'notify': (() => void) | null;
  'subscriber': ChannelStateEntity.Type['subscriber'];
}

export class Channel<T> {
  static create<T>(options?: ChannelOptionsEntity.Type): Channel<T> {
    const result = new this<T>(options);
    return result;
  }

  protected readonly hooks: HookInvoker = new HookInvoker();
  #closed = false;
  readonly #channels = new Map<string, ChannelStateInterface<T>>();
  readonly #highWaterMark: number | undefined;

  protected constructor(options?: ChannelOptionsEntity.Type) {
    this.#highWaterMark = options?.highWaterMark;
  }

  async close(): Promise<void> {
    this.#closed = true;
    for (const ch of this.#channels.values()) {
      ch.closed = true;
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
    if (ch.subscriber) {
      throw new ChannelError(key);
    }
    if (this.#closed) { ch.closed = true; }
    ch.subscriber = true;

    try {
      while (true) {
        const entry = ch.buffer.shift();
        if (entry !== undefined) {
          await entry.settled;
          if (entry.cancelled) {
            continue;
          }
          const item = entry.item;
          await this.hooks.invokeAsync('onDequeue', () => { const result = this.onDequeue(key, item); return result; });
          yield item;
          continue;
        }
        if (ch.closed) { return; }
        await new Promise<void>((resolve) => { ch.notify = resolve; });
      }
    } finally {
      ch.subscriber = false;
      // The channel-level close() has fired and this key's buffer is fully
      // drained (the only ways out of the loop above with ch.closed true) —
      // no further publish() or subscribe() can ever be useful for this key,
      // so the per-key entry is safe to evict.
      if (ch.closed && this.#channels.get(key) === ch) {
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
      'closed': false,
      'notify': null,
      'subscriber': false
    };
    this.#channels.set(key, fresh);
    return fresh;
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
