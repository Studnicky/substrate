/**
 * Fluent builder for `VirtualClockProvider`.
 *
 * @module
 */
import type { VirtualClockProvider } from './VirtualClockProvider.js';
import type { VirtualTimeCounter } from './VirtualTimeCounter.js';

import { ClockError } from '../errors/ClockError.js';

/**
 * Fluent builder for constructing a `VirtualClockProvider` instance via the create-closure idiom.
 */
export class VirtualClockProviderBuilder {
  static create(create: (counter: Readonly<VirtualTimeCounter>) => VirtualClockProvider): VirtualClockProviderBuilder {
    return new VirtualClockProviderBuilder(create);
  }

  readonly #create: (counter: Readonly<VirtualTimeCounter>) => VirtualClockProvider;
  #counter?: Readonly<VirtualTimeCounter>;

  private constructor(create: (counter: Readonly<VirtualTimeCounter>) => VirtualClockProvider) {
    this.#create = create;
  }

  withCounter(counter: Readonly<VirtualTimeCounter>): this {
    this.#counter = counter;
    return this;
  }

  build(): VirtualClockProvider {
    if (this.#counter === undefined) {
      throw new ClockError('counter is required');
    }
    const result = this.#create(this.#counter);
    return result;
  }
}
