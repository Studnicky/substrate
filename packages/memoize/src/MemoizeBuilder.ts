/**
 * Fluent builder for Memoize instances
 */

import type { Memoize } from './Memoize.js';
import type { MemoizeOptionsType } from './types/MemoizeOptionsType.js';

import { MemoizeConfigError } from './errors/index.js';

type MemoizeCreateFnType<TArgs extends unknown[], TResult> = (
  fn: (...args: TArgs) => TResult | Promise<TResult>,
  options: MemoizeOptionsType<TArgs>
) => Memoize<TArgs, TResult>;

/**
 * Builder for creating Memoize instances with a fluent API.
 *
 * @example
 * ```typescript
 * const memo = Memoize.builder<[string], User>()
 *   .withFn((userId) => fetchUser(userId))
 *   .withKeyFn((userId) => userId)
 *   .withCapacity(1000)
 *   .withTtlMs(60_000)
 *   .build();
 * ```
 */
export class MemoizeBuilder<TArgs extends unknown[], TResult> {
  static create<TArgs extends unknown[], TResult>(
    create: MemoizeCreateFnType<TArgs, TResult>
  ): MemoizeBuilder<TArgs, TResult> {
    return new MemoizeBuilder(create);
  }

  readonly #create: MemoizeCreateFnType<TArgs, TResult>;
  #capacity?: number;
  #fn?: (...args: TArgs) => TResult | Promise<TResult>;
  #keyFn?: (...args: TArgs) => string;
  #staleMs?: number;
  #ttlMs?: number;

  private constructor(create: MemoizeCreateFnType<TArgs, TResult>) {
    this.#create = create;
  }

  /** Set the function to memoize. */
  withFn(value: (...args: TArgs) => TResult | Promise<TResult>): this {
    this.#fn = value;
    return this;
  }

  /** Set the key derivation function applied to a call's arguments. */
  withKeyFn(value: (...args: TArgs) => string): this {
    this.#keyFn = value;
    return this;
  }

  /** Set the maximum number of distinct derived keys retained at once. */
  withCapacity(value: number): this {
    this.#capacity = value;
    return this;
  }

  /** Set the time-to-live (ms) for a cached result. */
  withTtlMs(value: number): this {
    this.#ttlMs = value;
    return this;
  }

  /** Set the staleness threshold (ms) for a cached result. */
  withStaleMs(value: number): this {
    this.#staleMs = value;
    return this;
  }

  build(): Memoize<TArgs, TResult> {
    if (this.#fn === undefined) {
      throw new MemoizeConfigError('fn is required');
    }
    if (this.#keyFn === undefined) {
      throw new MemoizeConfigError('keyFn is required');
    }
    if (this.#capacity === undefined) {
      throw new MemoizeConfigError('capacity is required');
    }

    const options: MemoizeOptionsType<TArgs> = {
      'capacity': this.#capacity,
      'keyFn': this.#keyFn,
      ...(this.#staleMs !== undefined ? { 'staleMs': this.#staleMs } : {}),
      ...(this.#ttlMs !== undefined ? { 'ttlMs': this.#ttlMs } : {})
    };

    return this.#create(this.#fn, options);
  }
}
