import type { Channel } from './Channel.js';
import type { ChannelOptionsType } from './ChannelOptionsType.js';

export class ChannelBuilder<T> {
  static create<T>(create: (options?: ChannelOptionsType) => Channel<T>): ChannelBuilder<T> {
    const result = new ChannelBuilder(create);
    return result;
  }

  readonly #create: (options?: ChannelOptionsType) => Channel<T>;
  #highWaterMark: number | undefined;

  private constructor(create: (options?: ChannelOptionsType) => Channel<T>) {
    this.#create = create;
  }

  withHighWaterMark(highWaterMark: number): this {
    this.#highWaterMark = highWaterMark;
    return this;
  }

  build(): Channel<T> {
    const options: ChannelOptionsType = this.#highWaterMark === undefined
      ? {}
      : { 'highWaterMark': this.#highWaterMark };
    const result = this.#create(options);
    return result;
  }
}
