import type { Channel } from './Channel.js';
import type { ChannelOptionsEntity } from './entities/ChannelOptionsEntity.js';

export class ChannelBuilder<T> {
  static create<T>(create: (options?: ChannelOptionsEntity.Type) => Channel<T>): ChannelBuilder<T> {
    const result = new ChannelBuilder(create);
    return result;
  }

  readonly #create: (options?: ChannelOptionsEntity.Type) => Channel<T>;
  #highWaterMark: number | undefined;

  private constructor(create: (options?: ChannelOptionsEntity.Type) => Channel<T>) {
    this.#create = create;
  }

  withHighWaterMark(highWaterMark: number): this {
    this.#highWaterMark = highWaterMark;
    return this;
  }

  build(): Channel<T> {
    const options: ChannelOptionsEntity.Type = this.#highWaterMark === undefined
      ? {}
      : { 'highWaterMark': this.#highWaterMark };
    const result = this.#create(options);
    return result;
  }
}
