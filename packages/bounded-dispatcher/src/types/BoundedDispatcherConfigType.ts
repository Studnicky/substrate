/**
 * BoundedDispatcher configuration type
 */

import type { BusQueueOptionsEntity, EventBus } from '@studnicky/event-bus';
import type { SchedulerProviderType } from '@studnicky/scheduler';

import type { BoundedDispatcherComposedTopicMapType } from './BoundedDispatcherTopicMapType.js';

/**
 * Configuration accepted by `BoundedDispatcher.create()` / `BoundedDispatcherBuilder`.
 *
 * Each composed primitive accepts either a pre-built instance (subclassed or not) or
 * the config shape passed straight to that primitive's own `create()`. `permits` is
 * shorthand for `Semaphore.create({ permits })`.
 */
export type BoundedDispatcherConfigType<TTopicMap extends Record<string, unknown>> = {
  /**
   * A pre-built `EventBus` instance, or `BusQueueOptionsEntity.Type` config passed to
   * `EventBus.create()`. Defaults to `EventBus.create({})`.
   */
  'bus'?: BusQueueOptionsEntity.Type | EventBus<BoundedDispatcherComposedTopicMapType<TTopicMap>>;

  /**
   * Semaphore permit count, shorthand for `Semaphore.create({ permits })`. Defaults to `1`.
   */
  'permits'?: number;

  /**
   * A pre-built `SchedulerProviderType` (`RealTimeScheduler` or `VirtualScheduler`).
   * Defaults to `RealTimeScheduler.create()`. Pass a `VirtualScheduler` for deterministic
   * test fixtures.
   */
  'scheduler'?: SchedulerProviderType;
};
