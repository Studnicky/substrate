/**
 * Fluent builder for RequestExecutor instances
 */

import type { Context } from '@studnicky/context';
import type { FetchClient } from '@studnicky/fetch';
import type { ClientConfigType } from '@studnicky/fetch/types';
import type { Retry, RetryConfigInterface } from '@studnicky/retry';
import type { Signal } from '@studnicky/signal';
import type { Timing } from '@studnicky/timing';

import { PickDefined } from '@studnicky/types';

import type { RequestExecutor } from './RequestExecutor.js';
import type { RequestExecutorConfigType } from './types/RequestExecutorConfigType.js';

/**
 * Builder for creating RequestExecutor instances with a fluent API.
 *
 * @example
 * ```typescript
 * const executor = RequestExecutor.builder()
 *   .fetchClient({ baseURL: 'https://api.example.com' })
 *   .retry({ maxRetries: 3 })
 *   .deadlineMs(5000)
 *   .build();
 * ```
 */
export class RequestExecutorBuilder {
  static create(create: (config: RequestExecutorConfigType) => RequestExecutor): RequestExecutorBuilder {
    return new RequestExecutorBuilder(create);
  }

  readonly #create: (config: RequestExecutorConfigType) => RequestExecutor;
  #fetchClient?: ClientConfigType | FetchClient;
  #retry?: RetryConfigInterface | Retry;
  #signal?: Signal;
  #timing?: Timing;
  #context?: Context;
  #deadlineMs?: number;

  private constructor(create: (config: RequestExecutorConfigType) => RequestExecutor) {
    this.#create = create;
  }

  /**
   * Build and return the RequestExecutor instance
   */
  build(): RequestExecutor {
    const config: RequestExecutorConfigType = PickDefined.from({
      'context': this.#context,
      'deadlineMs': this.#deadlineMs,
      'fetchClient': this.#fetchClient,
      'retry': this.#retry,
      'signal': this.#signal,
      'timing': this.#timing
    });
    return this.#create(config);
  }

  /**
   * Set the composed Context instance
   */
  context(value: Context): this {
    this.#context = value;
    return this;
  }

  /**
   * Set the default deadline (ms) for execute() calls
   */
  deadlineMs(value: number): this {
    this.#deadlineMs = value;
    return this;
  }

  /**
   * Set the composed FetchClient instance or config
   */
  fetchClient(value: ClientConfigType | FetchClient): this {
    this.#fetchClient = value;
    return this;
  }

  /**
   * Set the composed Retry instance or config
   */
  retry(value: RetryConfigInterface | Retry): this {
    this.#retry = value;
    return this;
  }

  /**
   * Set the composed Signal instance
   */
  signal(value: Signal): this {
    this.#signal = value;
    return this;
  }

  /**
   * Set the composed Timing instance
   */
  timing(value: Timing): this {
    this.#timing = value;
    return this;
  }
}
