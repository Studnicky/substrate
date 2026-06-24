import type { Channel } from './Channel.js';

export class ChannelBuilder<T> {
  static create<T>(create: () => Channel<T>): ChannelBuilder<T> {
    const result = new ChannelBuilder(create);
    return result;
  }

  readonly #create: () => Channel<T>;

  private constructor(create: () => Channel<T>) {
    this.#create = create;
  }

  build(): Channel<T> {
    const result = this.#create();
    return result;
  }
}
