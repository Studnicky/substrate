import type { ContextConfigType } from '../interfaces/ContextConfigType.js';
import type { Context } from './Context.js';

/**
 * Fluent builder for creating Context instances.
 *
 * @example
 * ```typescript
 * const context = Context.builder().name('request').build();
 * ```
 */
export class ContextBuilder {
  readonly #create: (config: ContextConfigType) => Context;

  /**
   * The context name, held as a protected field so subclasses can read it
   * in overridden validateBuild() implementations.
   */
  protected contextName: string | undefined;

  /**
   * @param create - Factory that materializes a Context from validated config.
   *   Injected by `Context.builder()` so this module needs only a type-level
   *   reference to Context (no runtime import cycle).
   */
  constructor(create: (config: ContextConfigType) => Context) {
    this.#create = create;
  }

  /**
   * Validation hook called in build() before the factory is invoked.
   * Subclasses override to add custom validation logic.
   *
   * @param config - The resolved config that will be passed to the factory
   */
  protected validateBuild(_config: ContextConfigType): void {}

  /**
   * Build and return the configured Context instance.
   *
   * @returns New Context instance
   * @throws {Error} If name has not been set
   */
  build(): Context {
    if (this.contextName === undefined) {
      throw new Error('Context name is required');
    }

    const config: ContextConfigType = { 'name': this.contextName };

    this.validateBuild(config);

    return this.#create(config);
  }

  /**
   * Set the context name.
   *
   * @param value - The context name
   * @returns This builder for chaining
   */
  name(value: string): this {
    this.contextName = value;

    return this;
  }
}
