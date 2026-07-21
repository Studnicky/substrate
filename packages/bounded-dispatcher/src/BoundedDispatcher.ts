/** Bounded work dispatch composing concurrency's Semaphore, event-bus's EventBus, and scheduler. */

import type { HookInvocationError } from '@studnicky/errors';
import type { ScheduledTaskInterface, SchedulerProviderInterface } from '@studnicky/scheduler';

import { Semaphore } from '@studnicky/concurrency';
import { HookInvoker } from '@studnicky/errors';
import { EventBus } from '@studnicky/event-bus';
import { RealTimeScheduler } from '@studnicky/scheduler';

import type { BoundedDispatcherConfigInterface } from './interfaces/BoundedDispatcherConfigInterface.js';
import type { BoundedDispatcherTopicMapInterface } from './interfaces/BoundedDispatcherTopicMapInterface.js';

interface BoundedDispatcherDepsInterface<TTopicMap extends BoundedDispatcherTopicMapInterface> {
  readonly 'bus': EventBus<TTopicMap>;
  readonly 'scheduler': SchedulerProviderInterface;
  readonly 'semaphore': Semaphore;
}

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
 * `EventBus`, reachable via `getBus()`. Rejected lifecycle publications are available through
 * `hookErrorCount` and `getHookErrors()` without replacing the dispatched work's result or error.
 * A caller's own `TTopicMap` merges onto the same bus alongside `'dispatch'`, so `getBus()` stays
 * usable for domain events too.
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
export class BoundedDispatcher<
  TTopicMap extends BoundedDispatcherTopicMapInterface = BoundedDispatcherTopicMapInterface
> {
  static readonly #OwnedHookInvoker = class BoundedDispatcherHookInvoker extends HookInvoker {
    protected override onHookError(_hookName: string, _cause: unknown): void {}
  };

  /**
   * Creates a new BoundedDispatcher, defaulting any omitted primitive.
   *
   * @param config - Composition configuration
   * @returns New BoundedDispatcher instance
   */
  static create<
    TTopicMap extends BoundedDispatcherTopicMapInterface = BoundedDispatcherTopicMapInterface
  >(
    config: BoundedDispatcherConfigInterface<TTopicMap> = {}
  ): BoundedDispatcher<TTopicMap> {
    const result = new this<TTopicMap>({
      'bus': BoundedDispatcher.#resolveBus<TTopicMap>(config.bus),
      'scheduler': config.scheduler ?? RealTimeScheduler.create(),
      'semaphore': Semaphore.create({ 'permits': config.permits ?? 1 })
    });
    return result;
  }

  static #resolveBus<TTopicMap extends BoundedDispatcherTopicMapInterface>(
    value: BoundedDispatcherConfigInterface<TTopicMap>['bus']
  ): EventBus<TTopicMap> {
    if (value instanceof EventBus) {
      return value;
    }
    const result = EventBus.create<TTopicMap>(value ?? {});
    return result;
  }

  readonly #bus: EventBus<TTopicMap>;
  readonly #publicationHooks: HookInvoker;
  readonly #scheduler: SchedulerProviderInterface;
  readonly #semaphore: Semaphore;

  protected constructor(deps: BoundedDispatcherDepsInterface<TTopicMap>) {
    this.#semaphore = deps.semaphore;
    this.#bus = deps.bus;
    this.#scheduler = deps.scheduler;
    this.#publicationHooks = new BoundedDispatcher.#OwnedHookInvoker();
  }

  /**
   * Acquires a `Semaphore` permit, runs `fn`, and publishes `'dispatch'` lifecycle events
   * (`start` before `fn` runs, then `success` or `error`) onto the composed `EventBus`. The
   * permit is released once `fn` settles, regardless of outcome.
   *
   * The `'dispatch'` publishes are best-effort observability: they are not awaited while the
   * permit is held, so a slow or backpressured `'dispatch'` subscriber cannot stall the permit
   * hold beyond `fn`'s own execution time, and cannot throttle the configured concurrency bound.
   * A rejected publication is recorded as a `HookInvocationError`; it never replaces `fn`'s
   * result or thrown value.
   *
   * @param fn - The work to run while holding a permit
   * @returns The result of `fn`
   */
  async dispatch<T>(fn: () => Promise<T> | T): Promise<T> {
    const result = await this.#semaphore.withPermit(async () => {
      this.#publicationHooks.invoke(
        'publishDispatchStart',
        (): unknown => {
          const publication = this.#bus.publish('dispatch', { 'phase': 'start' });
          return publication;
        }
      );

      try {
        const value = await fn();
        this.#publicationHooks.invoke(
          'publishDispatchSuccess',
          (): unknown => {
            const publication = this.#bus.publish('dispatch', { 'phase': 'success', 'result': value });
            return publication;
          }
        );
        return value;
      } catch (error: unknown) {
        this.#publicationHooks.invoke(
          'publishDispatchError',
          (): unknown => {
            const publication = this.#bus.publish('dispatch', { 'error': error, 'phase': 'error' });
            return publication;
          }
        );
        throw error;
      }
    });
    return result;
  }

  /** Count of rejected lifecycle publications recorded since construction. */
  get hookErrorCount(): number {
    const result = this.#publicationHooks.hookErrorCount;
    return result;
  }

  /** Returns detached diagnostics for every rejected lifecycle publication. */
  getHookErrors(): readonly HookInvocationError[] {
    const result = this.#publicationHooks.getHookErrors();
    return result;
  }

  /**
   * Schedules `fn` to run through `dispatch()` at `atMs` (epoch-ms, or virtual-ms for a
   * `VirtualScheduler`), returning the scheduler's own cancellable task handle.
   *
   * @param atMs - Absolute time to dispatch at
   * @param fn - The work to dispatch once `atMs` is reached
   * @returns The scheduler's `ScheduledTaskInterface` handle
   */
  scheduleDispatch<T>(atMs: number, fn: () => Promise<T> | T): ScheduledTaskInterface {
    const result = this.#scheduler.scheduleAt(atMs, async () => { await this.dispatch(fn); });
    return result;
  }

  getBus(): EventBus<TTopicMap> {
    return this.#bus;
  }
}
