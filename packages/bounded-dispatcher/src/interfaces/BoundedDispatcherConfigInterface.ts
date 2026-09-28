/**
 * BoundedDispatcher configuration type
 */

import type { Semaphore } from '@studnicky/concurrency/browser';
import type { SemaphoreOptionsEntity } from '@studnicky/concurrency/entities';
import type { EventBus } from '@studnicky/event-bus/browser';
import type { BusQueueOptionsEntity } from '@studnicky/event-bus/entities';
import type { OperationPipelineInterface } from '@studnicky/pipeline/interfaces';
import type { SchedulerProviderInterface } from '@studnicky/scheduler/browser';

import type { BoundedDispatcherOperationContextInterface } from './BoundedDispatcherOperationContextInterface.js';
import type { BoundedDispatcherTopicMapInterface } from './BoundedDispatcherTopicMapInterface.js';

/**
 * Configuration accepted by `BoundedDispatcher.create()`.
 *
 * Each composed primitive accepts either a pre-built instance (subclassed or not) or
 * the configuration passed directly to that primitive's own `create()` method.
 */
export interface BoundedDispatcherConfigInterface<
  TTopicMap extends BoundedDispatcherTopicMapInterface = BoundedDispatcherTopicMapInterface
> {
  /**
   * A pre-built `EventBus` instance, or `BusQueueOptionsEntity.InputType` config passed to
   * `EventBus.create()`. Defaults to `EventBus.create({})`.
   */
  readonly 'bus'?: BusQueueOptionsEntity.InputType | EventBus<TTopicMap>;

  /** Optional policies surrounding permit admission and the dispatched callback. */
  readonly 'pipeline'?: OperationPipelineInterface<BoundedDispatcherOperationContextInterface>;

  /**
   * A pre-built `SchedulerProviderInterface` (`RealTimeScheduler` or `VirtualScheduler`).
   * Defaults to `RealTimeScheduler.create()`. Pass a `VirtualScheduler` for deterministic
   * test fixtures.
   */
  readonly 'scheduler'?: SchedulerProviderInterface;

  /**
   * A pre-built `Semaphore` instance or `SemaphoreOptionsEntity.InputType` configuration passed
   * to `Semaphore.create()`. Defaults to `Semaphore.create({ permits: 1 })`.
   */
  readonly 'semaphore'?: Semaphore | SemaphoreOptionsEntity.InputType;
}
