/** Fluent builder for KeyedWorkGate instances */

import type { Coalesce, CoalesceOptionsType } from '@studnicky/concurrency';
import type { Mutex, MutexConfigEntity } from '@studnicky/mutex';

import type { KeyedWorkGate } from './KeyedWorkGate.js';
import type { KeyedWorkGateConfigType } from './types/KeyedWorkGateConfigType.js';

/**
 * Builder for creating KeyedWorkGate instances with a fluent API.
 *
 * @example
 * ```typescript
 * const gate = KeyedWorkGate.builder<string>()
 *   .mutex({ timeout: 5000 })
 *   .coalesce({ timeout: 2000 })
 *   .build();
 * ```
 */
export class KeyedWorkGateBuilder<K extends PropertyKey = string> {
  static create<K extends PropertyKey = string>(
    create: (config: KeyedWorkGateConfigType<K>) => KeyedWorkGate<K>
  ): KeyedWorkGateBuilder<K> {
    return new KeyedWorkGateBuilder<K>(create);
  }

  readonly #create: (config: KeyedWorkGateConfigType<K>) => KeyedWorkGate<K>;
  #coalesce?: Coalesce<unknown> | CoalesceOptionsType;
  #mutex?: Mutex<K> | Partial<MutexConfigEntity.Type>;

  private constructor(create: (config: KeyedWorkGateConfigType<K>) => KeyedWorkGate<K>) {
    this.#create = create;
  }

  /**
   * Build and return the KeyedWorkGate instance
   */
  build(): KeyedWorkGate<K> {
    const config: KeyedWorkGateConfigType<K> = {
      ...(this.#mutex !== undefined ? { 'mutex': this.#mutex } : {}),
      ...(this.#coalesce !== undefined ? { 'coalesce': this.#coalesce } : {})
    };
    return this.#create(config);
  }

  /**
   * Set the composed Coalesce instance or config
   */
  coalesce(value: Coalesce<unknown> | CoalesceOptionsType): this {
    this.#coalesce = value;
    return this;
  }

  /**
   * Set the composed Mutex instance or config
   */
  mutex(value: Mutex<K> | Partial<MutexConfigEntity.Type>): this {
    this.#mutex = value;
    return this;
  }
}
