/** String-keyed fan-in async generator inbox; one active subscriber per key. */

import { CircularBuffer } from '@studnicky/circular-buffer';
import { HookInvoker } from '@studnicky/errors';

import type { ChannelOptionsEntity } from './entities/ChannelOptionsEntity.js';

import { ChannelBuilder } from './ChannelBuilder.js';
import { ChannelError } from './errors/ChannelError.js';

// json-schema-uninexpressible: 'notify' is a function type and T is a generic type parameter — not a serializable data shape
type ChannelStateType<T> = {
  readonly 'buffer': CircularBuffer<T>;
  'closed': boolean;
  'notify': (() => void) | null;
  'subscriber': boolean;
};

export class Channel<T> {
  static builder<T>(): ChannelBuilder<T> {
    const result = ChannelBuilder.create<T>((options) => {
      const channel = Channel.create<T>(options);
      return channel;
    });
    return result;
  }

  static create<T>(options?: ChannelOptionsEntity.Type): Channel<T> {
    const result = new (this as unknown as new (options?: ChannelOptionsEntity.Type) => Channel<T>)(options);
    return result;
  }

  protected readonly hooks: HookInvoker = new HookInvoker();
  #closed = false;
  readonly #channels = new Map<string, ChannelStateType<T>>();
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
    await Promise.resolve(this.hooks.invoke('onClose', () => { const result = this.onClose(); return result; }));
  }

  async publish(key: string, item: T): Promise<void> {
    if (this.#closed) {
      await Promise.resolve(this.hooks.invoke('onPublishDropped', () => { const result = this.onPublishDropped(key, item); return result; }));
      return;
    }
    const ch = this.#getOrCreate(key);
    ch.buffer.push(item);
    await Promise.resolve(this.hooks.invoke('onEnqueue', () => { const result = this.onEnqueue(key, item); return result; }));
    if (this.#highWaterMark !== undefined && ch.buffer.length >= this.#highWaterMark) {
      await Promise.resolve(this.hooks.invoke('onOverflow', () => { const result = this.onOverflow(key, ch.buffer.length); return result; }));
    }
    if (ch.notify !== null) {
      const notify = ch.notify;
      ch.notify = null;
      notify();
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
        const item = ch.buffer.shift();
        if (item !== undefined) {
          await Promise.resolve(this.hooks.invoke('onDequeue', () => { const result = this.onDequeue(key, item); return result; }));
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

  #getOrCreate(key: string): ChannelStateType<T> {
    const existing = this.#channels.get(key);
    if (existing !== undefined) { return existing; }
    const fresh: ChannelStateType<T> = {
      'buffer': CircularBuffer.create<T>({ 'overflow': 'grow' }),
      'closed': false,
      'notify': null,
      'subscriber': false
    };
    this.#channels.set(key, fresh);
    return fresh;
  }

  /**
   * Fires in publish() right after ch.buffer.push(item) — item landed in buffer.
   * Overrides must not throw or block.
   */
  protected onEnqueue(_key: string, _item: T): void {}

  /**
   * Fires in subscribe() right after buffer.shift() succeeds — item dequeued.
   * Overrides must not throw or block.
   */
  protected onDequeue(_key: string, _item: T): void {}

  /**
   * Fires in publish() when #closed is true (item silently dropped).
   * Overrides must not throw or block.
   */
  protected onPublishDropped(_key: string, _item: T): void {}

  /**
   * Fires in close(), after closing and notifying all keys.
   * Overrides must not throw or block.
   */
  protected onClose(): void {}

  /**
   * Fires in publish() when a highWaterMark is configured and the per-key buffer
   * depth is at or above it, after the item has already landed in the buffer.
   * Purely observational — the item is never dropped or rejected; the channel
   * keeps consuming. Never fires when highWaterMark is left unconfigured.
   * Overrides must not throw or block.
   */
  protected onOverflow(_key: string, _depth: number): void {}
}
