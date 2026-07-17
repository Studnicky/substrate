/**
 * Fluent builder for `Clock`.
 *
 * @module
 */
import type { ClockProviderType } from '../types/ClockProviderType.js';
import type { Clock } from './Clock.js';

import { ClockError } from '../errors/ClockError.js';

/**
 * Fluent builder for constructing a `Clock` instance via the create-closure idiom.
 */
export class ClockBuilder {
  static create(create: (provider: ClockProviderType) => Clock): ClockBuilder {
    return new ClockBuilder(create);
  }

  readonly #create: (provider: ClockProviderType) => Clock;
  #provider?: ClockProviderType;

  private constructor(create: (provider: ClockProviderType) => Clock) {
    this.#create = create;
  }

  withProvider(provider: ClockProviderType): this {
    this.#provider = provider;
    return this;
  }

  build(): Clock {
    if (this.#provider === undefined) {
      throw new ClockError('provider is required');
    }
    const result = this.#create(this.#provider);
    return result;
  }
}
