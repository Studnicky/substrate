import type { VirtualTimeCounter } from '@studnicky/clock';

import type { VirtualScheduler } from './VirtualScheduler.js';

import { SchedulerError } from '../errors/index.js';

/** Builder for `VirtualScheduler`. Obtained via `VirtualScheduler.builder()`. */
export class VirtualSchedulerBuilder {
  /** Creates a `VirtualSchedulerBuilder` bound to the given `create` closure. */
  static create(
    create: (options: { readonly 'counter': Readonly<VirtualTimeCounter> }) => VirtualScheduler
  ): VirtualSchedulerBuilder {
    return new VirtualSchedulerBuilder(create);
  }

  readonly #create: (options: { readonly 'counter': Readonly<VirtualTimeCounter> }) => VirtualScheduler;
  #counter: Readonly<VirtualTimeCounter> | undefined;

  private constructor(
    create: (options: { readonly 'counter': Readonly<VirtualTimeCounter> }) => VirtualScheduler
  ) {
    this.#create = create;
  }

  /** Sets the `VirtualTimeCounter` to inject. */
  withCounter(value: Readonly<VirtualTimeCounter>): this {
    this.#counter = value;
    return this;
  }

  /** Builds and returns a new `VirtualScheduler`. Throws if `withCounter()` was not called. */
  build(): VirtualScheduler {
    if (this.#counter === undefined) {
      throw new SchedulerError('VirtualScheduler requires a counter — call withCounter() before build()');
    }
    const result = this.#create({ 'counter': this.#counter });
    return result;
  }
}
