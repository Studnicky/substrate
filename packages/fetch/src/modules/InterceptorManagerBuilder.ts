/**
 * Fluent builder for InterceptorManager
 */

import type { InterceptorManager } from './InterceptorManager.js';

/**
 * Fluent builder for constructing InterceptorManager instances
 */
export class InterceptorManagerBuilder {
  static create(create: () => InterceptorManager): InterceptorManagerBuilder {
    return new InterceptorManagerBuilder(create);
  }

  readonly #create: () => InterceptorManager;

  private constructor(create: () => InterceptorManager) {
    this.#create = create;
  }

  build(): InterceptorManager {
    const result = this.#create();
    return result;
  }
}
