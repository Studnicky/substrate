import type { Pipeline } from './Pipeline.js';

/**
 * Fluent builder for constructing Pipeline instances.
 *
 * Pipeline carries no configuration, so this builder exposes no `withX()`
 * setters — `build()` constructs the instance immediately via the
 * create-closure injected by `Pipeline.builder()`.
 *
 * @example
 * ```typescript
 * const pipeline = Pipeline.builder<RequestCtx>().build();
 * ```
 */
export class PipelineBuilder<T> {
  readonly #create: () => Pipeline<T>;

  /**
   * Create a PipelineBuilder with the given factory closure.
   * Called by `Pipeline.builder()` — not intended for direct use.
   *
   * @param create - Factory that materializes a Pipeline instance.
   *   Injected by `Pipeline.builder()` so this module needs only a type-level
   *   reference to Pipeline (no runtime import cycle).
   */
  static create<T>(create: () => Pipeline<T>): PipelineBuilder<T> {
    return new PipelineBuilder<T>(create);
  }

  private constructor(create: () => Pipeline<T>) {
    this.#create = create;
  }

  /**
   * Build and return a new Pipeline instance.
   *
   * @returns New Pipeline instance
   */
  build(): Pipeline<T> {
    const result = this.#create();
    return result;
  }
}
