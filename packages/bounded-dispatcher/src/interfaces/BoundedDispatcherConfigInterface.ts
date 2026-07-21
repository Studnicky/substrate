/**
 * BoundedDispatcher configuration type
 */

import type { SemaphoreOptionsEntity } from '@studnicky/concurrency';
import type { BusQueueOptionsEntity, EventBus } from '@studnicky/event-bus';
import type { SchedulerProviderInterface } from '@studnicky/scheduler';

import type { BoundedDispatcherTopicMapInterface } from './BoundedDispatcherTopicMapInterface.js';

/**
 * Configuration accepted by `BoundedDispatcher.create()`.
 *
 * Each composed primitive accepts either a pre-built instance (subclassed or not) or
 * the config shape passed straight to that primitive's own `create()`. `permits` is
 * shorthand for `Semaphore.create({ permits })`.
 */
export interface BoundedDispatcherConfigInterface<
  TTopicMap extends BoundedDispatcherTopicMapInterface = BoundedDispatcherTopicMapInterface
> {
  /**
   * A pre-built `EventBus` instance, or `BusQueueOptionsEntity.Type` config passed to
   * `EventBus.create()`. Defaults to `EventBus.create({})`.
   */
  readonly 'bus'?: BusQueueOptionsEntity.Type | EventBus<TTopicMap>;

  /**
   * Semaphore permit count, shorthand for `Semaphore.create({ permits })`. Defaults to `1`.
   */
  readonly 'permits'?: SemaphoreOptionsEntity.Type['permits'];

  /**
   * A pre-built `SchedulerProviderInterface` (`RealTimeScheduler` or `VirtualScheduler`).
   * Defaults to `RealTimeScheduler.create()`. Pass a `VirtualScheduler` for deterministic
   * test fixtures.
   */
  readonly 'scheduler'?: SchedulerProviderInterface;
}
