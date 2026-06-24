import type { ConsoleTransport } from './ConsoleTransport.js';
import type { ConsoleTransportOptionsType } from './ConsoleTransportOptionsType.js';

export class ConsoleTransportBuilder {
  static create(create: (options: ConsoleTransportOptionsType) => ConsoleTransport): ConsoleTransportBuilder {
    return new ConsoleTransportBuilder(create);
  }

  readonly #create: (options: ConsoleTransportOptionsType) => ConsoleTransport;
  #options: ConsoleTransportOptionsType = {};

  private constructor(create: (options: ConsoleTransportOptionsType) => ConsoleTransport) {
    this.#create = create;
  }

  withLevel(level: ConsoleTransportOptionsType['level']): this {
    if (level !== undefined) {
      this.#options = { ...this.#options, 'level': level };
    }
    return this;
  }

  build(): ConsoleTransport {
    const result = this.#create(this.#options);
    return result;
  }
}
