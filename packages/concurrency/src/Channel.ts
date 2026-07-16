/** String-keyed fan-in async generator inbox; one active subscriber per key. */

import type { ChannelOptionsEntity } from './entities/ChannelOptionsEntity.js';

import { ChannelBuilder } from './ChannelBuilder.js';

// json-schema-uninexpressible: 'notify' is a function type and T is a generic type parameter — not a serializable data shape
type ChannelStateType<T> = {
  readonly 'buffer': T[];
  'closed': boolean;
  'notify': (() => void) | null;
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

  #closed = false;
  readonly #channels = new Map<string, ChannelStateType<T>>();
  readonly #highWaterMark: number | undefined;

  protected constructor(options?: ChannelOptionsEntity.Type) {
    this.#highWaterMark = options?.highWaterMark;
  }

  close(): void {
    this.#closed = true;
    for (const ch of this.#channels.values()) {
      ch.closed = true;
      if (ch.notify !== null) {
        const notify = ch.notify;
        ch.notify = null;
        notify();
      }
    }
    this.#invokeHook(() => { this.onClose(); });
  }

  publish(key: string, item: T): void {
    if (this.#closed) {
      this.#invokeHook(() => { this.onPublishDropped(key, item); });
      return;
    }
    const ch = this.#getOrCreate(key);
    ch.buffer.push(item);
    this.#invokeHook(() => { this.onEnqueue(key, item); });
    this.#invokeHook(() => { this.onSend(key, item); });
    if (this.#highWaterMark !== undefined && ch.buffer.length >= this.#highWaterMark) {
      this.#invokeHook(() => { this.onOverflow(key, ch.buffer.length); });
    }
    if (ch.notify !== null) {
      const notify = ch.notify;
      ch.notify = null;
      notify();
    }
  }

  async *subscribe(key: string): AsyncGenerator<T> {
    const ch = this.#getOrCreate(key);
    if (this.#closed) { ch.closed = true; }

    while (true) {
      const item = ch.buffer.shift();
      if (item !== undefined) {
        this.#invokeHook(() => { this.onDequeue(key, item); });
        this.#invokeHook(() => { this.onReceive(key, item); });
        yield item;
        continue;
      }
      if (ch.closed) { return; }
      await new Promise<void>((resolve) => { ch.notify = resolve; });
    }
  }

  #getOrCreate(key: string): ChannelStateType<T> {
    const existing = this.#channels.get(key);
    if (existing !== undefined) { return existing; }
    const fresh: ChannelStateType<T> = { 'buffer': [], 'closed': false, 'notify': null };
    this.#channels.set(key, fresh);
    return fresh;
  }

  #invokeHook(hook: () => void): void {
    try {
      hook();
    } catch {}
  }

  /**
   * Fires in publish() right after ch.buffer.push(item) — item landed in buffer.
   * Overrides must not throw or block.
   */
  protected onEnqueue(_key: string, _item: T): void {}

  /**
   * Fires in publish() when channel is open, after buffer push (before notify).
   * Overrides must not throw or block.
   */
  protected onSend(_key: string, _item: T): void {}

  /**
   * Fires in subscribe() right after buffer.shift() succeeds — item dequeued.
   * Overrides must not throw or block.
   */
  protected onDequeue(_key: string, _item: T): void {}

  /**
   * Fires in subscribe() after shift() confirms item present, before yield.
   * Overrides must not throw or block.
   */
  protected onReceive(_key: string, _item: T): void {}

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
