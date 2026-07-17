import type { LruCacheOptionsEntity } from './entities/LruCacheOptionsEntity.js';
import type { LruCache } from './LruCache.js';

import { CacheConfigError } from './errors/index.js';

export class LruCacheBuilder<K = unknown, V = unknown> {
  static create<K = unknown, V = unknown>(
    create: (options: LruCacheOptionsEntity.Type) => LruCache<K, V>
  ): LruCacheBuilder<K, V> {
    return new LruCacheBuilder<K, V>(create);
  }

  readonly #create: (options: LruCacheOptionsEntity.Type) => LruCache<K, V>;
  #capacity?: number;
  #ttlMs?: number;
  #staleMs?: number;
  #prefix?: string;

  private constructor(create: (options: LruCacheOptionsEntity.Type) => LruCache<K, V>) {
    this.#create = create;
  }

  withCapacity(value: number): this {
    this.#capacity = value;
    return this;
  }

  withTtlMs(value: number): this {
    this.#ttlMs = value;
    return this;
  }

  withStaleMs(value: number): this {
    this.#staleMs = value;
    return this;
  }

  withPrefix(value: string): this {
    this.#prefix = value;
    return this;
  }

  build(): LruCache<K, V> {
    if (this.#capacity === undefined) {
      throw new CacheConfigError('capacity is required');
    }
    const options: LruCacheOptionsEntity.Type = {
      'capacity': this.#capacity,
      ...(this.#ttlMs !== undefined && { 'ttlMs': this.#ttlMs }),
      ...(this.#staleMs !== undefined && { 'staleMs': this.#staleMs }),
      ...(this.#prefix !== undefined && { 'prefix': this.#prefix })
    };
    return this.#create(options);
  }
}
