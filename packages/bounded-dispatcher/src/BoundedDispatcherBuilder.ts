/**
 * Fluent builder for BoundedDispatcher instances
 */

import type { BusQueueOptionsEntity, EventBus } from '@studnicky/event-bus';
import type { SchedulerProviderType } from '@studnicky/scheduler';

import type { BoundedDispatcher } from './BoundedDispatcher.js';
import type { BoundedDispatcherConfigType } from './types/BoundedDispatcherConfigType.js';
import type { BoundedDispatcherComposedTopicMapType } from './types/BoundedDispatcherTopicMapType.js';

/**
 * Builder for creating BoundedDispatcher instances with a fluent API.
 *
 * @example
 * ```typescript
 * const dispatcher = BoundedDispatcher.builder()
 *   .permits(2)
 *   .build();
 * ```
 */
export class BoundedDispatcherBuilder<TTopicMap extends Record<string, unknown> = Record<string, unknown>> {
  static create<TTopicMap extends Record<string, unknown> = Record<string, unknown>>(
    create: (config: BoundedDispatcherConfigType<TTopicMap>) => BoundedDispatcher<TTopicMap>
  ): BoundedDispatcherBuilder<TTopicMap> {
    return new BoundedDispatcherBuilder<TTopicMap>(create);
  }

  readonly #create: (config: BoundedDispatcherConfigType<TTopicMap>) => BoundedDispatcher<TTopicMap>;
  #bus?: BusQueueOptionsEntity.Type | EventBus<BoundedDispatcherComposedTopicMapType<TTopicMap>>;
  #permits?: number;
  #scheduler?: SchedulerProviderType;

  private constructor(create: (config: BoundedDispatcherConfigType<TTopicMap>) => BoundedDispatcher<TTopicMap>) {
    this.#create = create;
  }

  /**
   * Set the composed EventBus instance or config
   */
  bus(value: BusQueueOptionsEntity.Type | EventBus<BoundedDispatcherComposedTopicMapType<TTopicMap>>): this {
    this.#bus = value;
    return this;
  }

  /**
   * Build and return the BoundedDispatcher instance
   */
  build(): BoundedDispatcher<TTopicMap> {
    const config: BoundedDispatcherConfigType<TTopicMap> = {
      ...(this.#bus !== undefined ? { 'bus': this.#bus } : {}),
      ...(this.#permits !== undefined ? { 'permits': this.#permits } : {}),
      ...(this.#scheduler !== undefined ? { 'scheduler': this.#scheduler } : {})
    };
    return this.#create(config);
  }

  /**
   * Set the semaphore permit count
   */
  permits(value: number): this {
    this.#permits = value;
    return this;
  }

  /**
   * Set the composed SchedulerProviderType instance
   */
  scheduler(value: SchedulerProviderType): this {
    this.#scheduler = value;
    return this;
  }
}
