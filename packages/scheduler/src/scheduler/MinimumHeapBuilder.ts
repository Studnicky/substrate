import type { MinimumHeap } from './MinimumHeap.js';

/** Builder for `MinimumHeap`. Obtained via `MinimumHeap.builder()`. */
export class MinimumHeapBuilder {
  /** Creates a `MinimumHeapBuilder` bound to the given `create` closure. */
  static create(create: () => MinimumHeap): MinimumHeapBuilder {
    return new MinimumHeapBuilder(create);
  }

  readonly #create: () => MinimumHeap;

  private constructor(create: () => MinimumHeap) {
    this.#create = create;
  }

  /** Builds and returns a new `MinimumHeap`. */
  build(): MinimumHeap {
    const result = this.#create();
    return result;
  }
}
