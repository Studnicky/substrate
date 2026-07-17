import type { Channel } from './Channel.js';
import type { ChannelOptionsEntity } from './entities/ChannelOptionsEntity.js';

import { SingleOptionBuilder } from './SingleOptionBuilder.js';

export class ChannelBuilder<T> {
  static create<T>(create: (options?: ChannelOptionsEntity.Type) => Channel<T>): ChannelBuilder<T> {
    const result = new ChannelBuilder(create);
    return result;
  }

  readonly #inner: SingleOptionBuilder<'highWaterMark', number, ChannelOptionsEntity.Type, Channel<T>>;

  private constructor(create: (options?: ChannelOptionsEntity.Type) => Channel<T>) {
    this.#inner = SingleOptionBuilder.create<'highWaterMark', number, ChannelOptionsEntity.Type, Channel<T>>(
      'highWaterMark',
      create
    );
  }

  withHighWaterMark(highWaterMark: number): this {
    this.#inner.withValue(highWaterMark);
    return this;
  }

  build(): Channel<T> {
    const result = this.#inner.build();
    return result;
  }
}
