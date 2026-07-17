import type { VisibleRangeConfigInterface } from './interfaces/VisibleRangeConfigInterface.js';
import type { VisibleRange } from './VisibleRange.js';

/**
 * Fluent builder for creating {@link VisibleRange} instances.
 *
 * @example
 * ```typescript
 * const range = VisibleRange.builder().withCount(1000).withItemSize(40).withOverscan(2).build();
 * ```
 */
export class VisibleRangeBuilder {
  static create(create: (config: VisibleRangeConfigInterface) => VisibleRange): VisibleRangeBuilder {
    return new VisibleRangeBuilder(create);
  }

  readonly #create: (config: VisibleRangeConfigInterface) => VisibleRange;
  #count?: number;
  #itemSize?: number;
  #estimateSize?: (index: number) => number;
  #overscan?: number;

  private constructor(create: (config: VisibleRangeConfigInterface) => VisibleRange) {
    this.#create = create;
  }

  withCount(value: number): this {
    this.#count = value;
    return this;
  }

  /** Mutually exclusive with `withEstimateSize()`. */
  withItemSize(value: number): this {
    this.#itemSize = value;
    return this;
  }

  /** Mutually exclusive with `withItemSize()`. */
  withEstimateSize(value: (index: number) => number): this {
    this.#estimateSize = value;
    return this;
  }

  withOverscan(value: number): this {
    this.#overscan = value;
    return this;
  }

  build(): VisibleRange {
    const config: VisibleRangeConfigInterface = {
      'count': this.#count ?? 0,
      ...(this.#itemSize === undefined ? {} : { 'itemSize': this.#itemSize }),
      ...(this.#estimateSize === undefined ? {} : { 'estimateSize': this.#estimateSize }),
      ...(this.#overscan === undefined ? {} : { 'overscan': this.#overscan })
    };
    const result = this.#create(config);
    return result;
  }
}
