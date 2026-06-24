import type { NoOpTransport } from './NoOpTransport.js';

export class NoOpTransportBuilder {
  static create(create: () => NoOpTransport): NoOpTransportBuilder {
    return new NoOpTransportBuilder(create);
  }

  readonly #create: () => NoOpTransport;

  private constructor(create: () => NoOpTransport) {
    this.#create = create;
  }

  build(): NoOpTransport {
    const result = this.#create();
    return result;
  }
}
