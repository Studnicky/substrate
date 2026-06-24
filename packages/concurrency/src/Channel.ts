/** String-keyed fan-in async generator inbox; one active subscriber per key. */

import { ChannelBuilder } from './ChannelBuilder.js';

type ChannelStateType<T> = {
  readonly 'buffer': T[];
  'closed': boolean;
  'notify': (() => void) | null;
};

export class Channel<T> {
  static builder<T>(): ChannelBuilder<T> {
    const result = ChannelBuilder.create<T>(() => {
      const channel = Channel.create<T>();
      return channel;
    });
    return result;
  }

  static create<T>(): Channel<T> {
    const result = new (this as unknown as new () => Channel<T>)();
    return result;
  }

  #closed = false;
  readonly #channels = new Map<string, ChannelStateType<T>>();

  protected constructor() {
    // no-op
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
  }

  publish(key: string, item: T): void {
    if (this.#closed) { return; }
    const ch = this.#getOrCreate(key);
    ch.buffer.push(item);
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
      if (item !== undefined) { yield item; continue; }
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
}
