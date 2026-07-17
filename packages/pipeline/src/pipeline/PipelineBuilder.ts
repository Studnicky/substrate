import type { PipelineOptionsEntity } from '../entities/PipelineOptionsEntity.js';
import type { Pipeline } from './Pipeline.js';

/**
 * Fluent builder for constructing Pipeline instances.
 *
 * @example
 * ```typescript
 * const pipeline = Pipeline.builder<RequestCtx>().hookTimeoutMs(5000).build();
 * ```
 */
export class PipelineBuilder<T> {
  readonly #create: (options?: Readonly<PipelineOptionsEntity.Type>) => Pipeline<T>;
  #hookTimeoutMs: number | undefined;

  /**
   * Create a PipelineBuilder with the given factory closure.
   * Called by `Pipeline.builder()` — not intended for direct use.
   *
   * @param create - Factory that materializes a Pipeline instance from
   *   options. Injected by `Pipeline.builder()` so this module needs only a
   *   type-level reference to Pipeline (no runtime import cycle).
   */
  static create<T>(create: (options?: Readonly<PipelineOptionsEntity.Type>) => Pipeline<T>): PipelineBuilder<T> {
    return new PipelineBuilder<T>(create);
  }

  private constructor(create: (options?: Readonly<PipelineOptionsEntity.Type>) => Pipeline<T>) {
    this.#create = create;
  }

  /**
   * Sets the timeout, in milliseconds, that each void observer hook
   * (`onStageStart`, `onStageSuccess`, `onStageError`, `onRunError`) races
   * against. Left unset, a hook may take arbitrarily long — matching prior
   * behavior. Validated by `Pipeline`'s constructor against
   * `PipelineOptionsEntity.Schema`.
   *
   * @param value - Timeout in milliseconds
   * @returns This builder, for chaining
   */
  hookTimeoutMs(value: number): this {
    this.#hookTimeoutMs = value;
    return this;
  }

  /**
   * Build and return a new Pipeline instance.
   *
   * @returns New Pipeline instance
   */
  build(): Pipeline<T> {
    const options: Readonly<PipelineOptionsEntity.Type> | undefined = this.#hookTimeoutMs === undefined
      ? undefined
      : { 'hookTimeoutMs': this.#hookTimeoutMs };
    const result = this.#create(options);
    return result;
  }
}
