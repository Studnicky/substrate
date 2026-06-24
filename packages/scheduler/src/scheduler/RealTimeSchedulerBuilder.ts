import type { RealTimeScheduler } from './RealTimeScheduler.js';

/** Builder for `RealTimeScheduler`. Obtained via `RealTimeScheduler.builder()`. */
export class RealTimeSchedulerBuilder {
  /** Creates a `RealTimeSchedulerBuilder` bound to the given `create` closure. */
  static create(create: () => RealTimeScheduler): RealTimeSchedulerBuilder {
    return new RealTimeSchedulerBuilder(create);
  }

  readonly #create: () => RealTimeScheduler;

  private constructor(create: () => RealTimeScheduler) {
    this.#create = create;
  }

  /** Builds and returns a new `RealTimeScheduler`. */
  build(): RealTimeScheduler {
    const result = this.#create();
    return result;
  }
}
