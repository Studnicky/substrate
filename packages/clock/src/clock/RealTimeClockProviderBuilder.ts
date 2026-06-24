/**
 * Fluent builder for `RealTimeClockProvider`.
 *
 * @module
 */
import type { RealTimeClockProviderOptionsEntity } from '../entities/RealTimeClockProviderOptionsEntity.js';
import type { RealTimeClockProvider } from './RealTimeClockProvider.js';

/**
 * Fluent builder for constructing a `RealTimeClockProvider` instance via the create-closure idiom.
 */
export class RealTimeClockProviderBuilder {
  static create(create: (options: RealTimeClockProviderOptionsEntity.Type) => RealTimeClockProvider): RealTimeClockProviderBuilder {
    return new RealTimeClockProviderBuilder(create);
  }

  readonly #create: (options: RealTimeClockProviderOptionsEntity.Type) => RealTimeClockProvider;
  #offsetMs?: number;

  private constructor(create: (options: RealTimeClockProviderOptionsEntity.Type) => RealTimeClockProvider) {
    this.#create = create;
  }

  withOffsetMs(value: number): this {
    this.#offsetMs = value;
    return this;
  }

  build(): RealTimeClockProvider {
    const options: RealTimeClockProviderOptionsEntity.Type = {
      ...(this.#offsetMs !== undefined && { 'offsetMs': this.#offsetMs })
    };
    const result = this.#create(options);
    return result;
  }
}
