import type { MemoryTransport } from './MemoryTransport.js';
import type { MemoryTransportOptionsType } from './MemoryTransportOptionsType.js';

export class MemoryTransportBuilder {
  static create(create: (options: MemoryTransportOptionsType) => MemoryTransport): MemoryTransportBuilder {
    return new MemoryTransportBuilder(create);
  }

  readonly #create: (options: MemoryTransportOptionsType) => MemoryTransport;
  #options: MemoryTransportOptionsType = {};

  private constructor(create: (options: MemoryTransportOptionsType) => MemoryTransport) {
    this.#create = create;
  }

  withLevel(level: MemoryTransportOptionsType['level']): this {
    if (level !== undefined) {
      this.#options = { ...this.#options, 'level': level };
    }
    return this;
  }

  build(): MemoryTransport {
    const result = this.#create(this.#options);
    return result;
  }
}
