/**
 * Fluent builder for `VirtualTimeCounter`.
 *
 * @module
 */
import { PickDefined } from '@studnicky/types';

import type { VirtualTimeCounterOptionsEntity } from '../entities/VirtualTimeCounterOptionsEntity.js';
import type { VirtualTimeCounter } from './VirtualTimeCounter.js';

/**
 * Fluent builder for constructing a `VirtualTimeCounter` instance via the create-closure idiom.
 */
export class VirtualTimeCounterBuilder {
  static create(create: (options: VirtualTimeCounterOptionsEntity.Type) => VirtualTimeCounter): VirtualTimeCounterBuilder {
    return new VirtualTimeCounterBuilder(create);
  }

  readonly #create: (options: VirtualTimeCounterOptionsEntity.Type) => VirtualTimeCounter;
  #startMs?: number;

  private constructor(create: (options: VirtualTimeCounterOptionsEntity.Type) => VirtualTimeCounter) {
    this.#create = create;
  }

  withStartMs(value: number): this {
    this.#startMs = value;
    return this;
  }

  build(): VirtualTimeCounter {
    const options: VirtualTimeCounterOptionsEntity.Type = PickDefined.from({
      'startMs': this.#startMs
    });
    const result = this.#create(options);
    return result;
  }
}
