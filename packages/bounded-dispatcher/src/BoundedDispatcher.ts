/** Bounded work dispatch composing concurrency's Semaphore, event-bus's EventBus, and scheduler. */

import type { ScheduledTaskType, SchedulerProviderType } from '@studnicky/scheduler';

import { Semaphore } from '@studnicky/concurrency';
import { EventBus } from '@studnicky/event-bus';
import { RealTimeScheduler } from '@studnicky/scheduler';

import type { BoundedDispatcherConfigType } from './types/BoundedDispatcherConfigType.js';
import type { BoundedDispatcherComposedTopicMapType } from './types/BoundedDispatcherTopicMapType.js';

import { BoundedDispatcherBuilder } from './BoundedDispatcherBuilder.js';

type BoundedDispatcherDepsType<TTopicMap extends Record<string, unknown>> = {
  'bus': EventBus<BoundedDispatcherComposedTopicMapType<TTopicMap>>;
  'scheduler': SchedulerProviderType;
  'semaphore': Semaphore;
};

/**
 * Composes `@studnicky/concurrency`'s `Semaphore`, `@studnicky/event-bus`'s `EventBus`, and
 * `@studnicky/scheduler` into the "bounded work dispatch" pattern: `dispatch()` acquires a
 * `Semaphore` permit before running the caller's `fn`, and publishes `'dispatch'` lifecycle
 * events (`start` / `success` / `error`) onto the composed `EventBus` around the call.
 * `scheduleDispatch()` layers a `scheduler`-driven delayed dispatch on top, returning the
 * scheduler's own cancellable task handle.
 *
 * `BoundedDispatcher` has no lifecycle hooks of its own. Permit-level observability stays on
 * `Semaphore`'s existing hooks (`onAcquire`, `onAcquireWait`, `onContended`, `onRelease`,
 * `onReleaseDelegated`); dispatch-level observability is the `'dispatch'` topic on the composed
 * `EventBus`, reachable via `getBus()`. A caller's own `TTopicMap` merges onto the same bus
 * alongside `'dispatch'`, so `getBus()` stays usable for domain events too.
 *
 * @example Direct composition
 * ```typescript
 * const dispatcher = BoundedDispatcher.create({ permits: 2 });
 *
 * const results = await Promise.all(
 *   [1, 2, 3].map((n) => dispatcher.dispatch(() => doWork(n)))
 * );
 * ```
 */
export class BoundedDispatcher<TTopicMap extends Record<string, unknown> = Record<string, unknown>> {
  /**
   * Creates a new BoundedDispatcher, defaulting any omitted primitive.
   *
   * @param config - Composition configuration
   * @returns New BoundedDispatcher instance
   */
  static create<TTopicMap extends Record<string, unknown> = Record<string, unknown>>(
    config: BoundedDispatcherConfigType<TTopicMap> = {}
  ): BoundedDispatcher<TTopicMap> {
    const result = new this<TTopicMap>({
      'bus': BoundedDispatcher.#resolveBus<TTopicMap>(config.bus),
      'scheduler': config.scheduler ?? RealTimeScheduler.create(),
      'semaphore': Semaphore.create({ 'permits': config.permits ?? 1 })
    });
    return result;
  }

  static builder<TTopicMap extends Record<string, unknown> = Record<string, unknown>>(): BoundedDispatcherBuilder<TTopicMap> {
    const result = BoundedDispatcherBuilder.create<TTopicMap>((config) => {
      const dispatcher = BoundedDispatcher.create<TTopicMap>(config);
      return dispatcher;
    });
    return result;
  }

  static #resolveBus<TTopicMap extends Record<string, unknown>>(
    value: BoundedDispatcherConfigType<TTopicMap>['bus']
  ): EventBus<BoundedDispatcherComposedTopicMapType<TTopicMap>> {
    if (value instanceof EventBus) {
      return value;
    }
    const result = EventBus.create<BoundedDispatcherComposedTopicMapType<TTopicMap>>(value ?? {});
    return result;
  }

  readonly #bus: EventBus<BoundedDispatcherComposedTopicMapType<TTopicMap>>;
  readonly #scheduler: SchedulerProviderType;
  readonly #semaphore: Semaphore;

  protected constructor(deps: BoundedDispatcherDepsType<TTopicMap>) {
    this.#semaphore = deps.semaphore;
    this.#bus = deps.bus;
    this.#scheduler = deps.scheduler;
  }

  /**
   * Acquires a `Semaphore` permit, runs `fn`, and publishes `'dispatch'` lifecycle events
   * (`start` before `fn` runs, then `success` or `error`) onto the composed `EventBus`. The
   * permit is released once `fn` settles, regardless of outcome.
   *
   * @param fn - The work to run while holding a permit
   * @returns The result of `fn`
   */
  async dispatch<T>(fn: () => Promise<T> | T): Promise<T> {
    const result = await this.#semaphore.withPermit(async () => {
      await this.#bus.publish('dispatch', { 'phase': 'start' });

      try {
        const value = await fn();
        await this.#bus.publish('dispatch', { 'phase': 'success', 'result': value });
        return value;
      } catch (error: unknown) {
        await this.#bus.publish('dispatch', { 'error': error, 'phase': 'error' });
        throw error;
      }
    });
    return result;
  }

  /**
   * Schedules `fn` to run through `dispatch()` at `atMs` (epoch-ms, or virtual-ms for a
   * `VirtualScheduler`), returning the scheduler's own cancellable task handle.
   *
   * @param atMs - Absolute time to dispatch at
   * @param fn - The work to dispatch once `atMs` is reached
   * @returns The scheduler's `ScheduledTaskType` handle
   */
  scheduleDispatch<T>(atMs: number, fn: () => Promise<T> | T): ScheduledTaskType {
    const result = this.#scheduler.scheduleAt(atMs, async () => { await this.dispatch(fn); });
    return result;
  }

  getBus(): EventBus<BoundedDispatcherComposedTopicMapType<TTopicMap>> {
    return this.#bus;
  }

  getScheduler(): SchedulerProviderType {
    return this.#scheduler;
  }

  getSemaphore(): Semaphore {
    return this.#semaphore;
  }
}
