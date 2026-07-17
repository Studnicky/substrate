/**
 * Deterministic `SchedulerProvider` backed by a minimum-heap of pending tasks.
 * Pairs with `VirtualClockProvider` — both share a `VirtualTimeCounter`.
 *
 * Methods:
 * - `advance(ms)` — advances virtual time and fires all tasks scheduled before the new time.
 * - `runUntil(atMs)` — fires all tasks scheduled at or before `atMs`.
 * - `runAll()` — fires every pending task in ascending fire-time order.
 *
 * @module
 */
import type { VirtualTimeCounter } from '@studnicky/clock';

import { HookInvoker } from '@studnicky/errors';

import type { PendingTaskType } from '../types/PendingTaskType.js';
import type { ScheduledTaskType } from '../types/ScheduledTaskType.js';
import type { SchedulerProviderType } from '../types/SchedulerProviderType.js';

import { SchedulerError } from '../errors/index.js';
import { CancellableTask } from './CancellableTask.js';
import { MinimumHeap } from './MinimumHeap.js';
import { VirtualSchedulerBuilder } from './VirtualSchedulerBuilder.js';

/**
 * A broken lifecycle hook must never abort scheduler machinery: swallow the
 * failure instead of `HookInvoker`'s default (throwing) behavior.
 */
class SwallowingHookInvoker extends HookInvoker {
  protected override onHookError<T>(_hookName: string, _cause: unknown): T {
    const result = undefined as T;
    return result;
  }
}

/**
 * Deterministic `SchedulerProvider` for testing.
 * Time only advances when you call `advance`, `runUntil`, or `runAll`.
 *
 * Subclass extension seams:
 * - `generateId()` — override to control task ID generation
 * - `createHeap()` — override to substitute a custom heap implementation
 * - `virtualCounter` — protected getter for the shared time counter
 * - `isCancelled(id)` — query the cancelled-IDs set
 * - Lifecycle hooks: `onSchedule`, `onFire`, `onFireError`, `onReschedule`, `onCancel`,
 *   `onCancelAll`, `onAdvance`, `onRunUntil`, `onIdle`
 */
export class VirtualScheduler implements SchedulerProviderType {
  protected readonly hooks: HookInvoker = new SwallowingHookInvoker();
  readonly #cancelledIds: Set<string>;
  readonly #counter: Readonly<VirtualTimeCounter>;
  readonly #heap: MinimumHeap;
  #idCounter: number;

  /**
   * Property write order: #cancelledIds, #counter, #idCounter, #heap.
   *
   * @param counter - Shared `VirtualTimeCounter`. Pass the same instance to
   *                  `VirtualClockProvider` so `Clock.now()` and task fires stay in sync.
   */
  protected constructor(counter: Readonly<VirtualTimeCounter>) {
    if (counter === null || typeof counter !== 'object' || typeof counter.nowMs !== 'function' || typeof counter.advance !== 'function') {
      throw new SchedulerError('VirtualScheduler requires a valid VirtualTimeCounter instance with nowMs() and advance() methods');
    }
    this.#cancelledIds = new Set();
    this.#counter = counter;
    this.#idCounter = 0;
    this.#heap = this.createHeap();
  }

  /** Creates a new `VirtualScheduler` with the given options. */
  static create(options: { readonly 'counter': Readonly<VirtualTimeCounter> }): VirtualScheduler {
    return new this(options.counter);
  }

  /** Returns a `VirtualSchedulerBuilder` pre-wired to create `VirtualScheduler` instances. */
  static builder(): VirtualSchedulerBuilder {
    const result = VirtualSchedulerBuilder.create((options) => { const instance = VirtualScheduler.create(options); return instance; });
    return result;
  }

  /** Returns a unique task ID. Override to customise the ID format. */
  protected generateId(): string {
    this.#idCounter = this.#idCounter + 1;
    return `vtask-${this.#idCounter.toString()}`;
  }

  /** Creates the heap used to store pending tasks. Override to substitute a custom heap. */
  protected createHeap(): MinimumHeap {
    const result = MinimumHeap.create();
    return result;
  }

  /** Protected access to the shared virtual time counter. */
  protected get virtualCounter(): Readonly<VirtualTimeCounter> {
    const result = this.#counter;
    return result;
  }

  /** Returns `true` if the given task ID has been cancelled. */
  protected isCancelled(id: string): boolean {
    const result = this.#cancelledIds.has(id);
    return result;
  }

  /**
   * Invokes a pending task's `fire` callback with error containment.
   * Synchronous throws are forwarded to `onFireError`; async rejections are
   * forwarded via a `.catch` handler. Returns `true` when the synchronous
   * portion succeeded (i.e. fire did not throw), `false` when it did.
   *
   * Extracted from the hot loop bodies so V8 can optimise the loops
   * independently of try/catch deoptimisation.
   */
  #invokeTask(task: PendingTaskType): boolean {
    let fireResult: Promise<void> | void;

    try {
      fireResult = task.fire();
    } catch (error: unknown) {
      this.hooks.invoke('onFireError', () => {
        const result = this.onFireError(task.id, error);
        return result;
      });
      return false;
    }

    if (fireResult instanceof Promise) {
      fireResult.catch((error: unknown) => {
        this.hooks.invoke('onFireError', () => {
          const result = this.onFireError(task.id, error);
          return result;
        });
      });
    }

    return true;
  }

  /** Called after a task is inserted into the heap via `scheduleAt` or `scheduleEvery`. */
  protected onSchedule(_id: string, _atMs: number, _variant: 'interval' | 'timeout'): void { return; }

  /** Called immediately before a task's `fire` callback is invoked. */
  protected onFire(_id: string): void { return; }

  /**
   * Called when a fired task's callback throws synchronously or returns a rejected Promise.
   * The error is still silently swallowed by the scheduler — this hook is the only
   * observability seam for task-level failures.
   */
  protected onFireError(_id: string, _error: unknown): void { return; }

  /**
   * Called after an interval task is re-inserted into the heap following a successful fire.
   * Fires once per reschedule, with the newly computed `atMs`.
   */
  protected onReschedule(_id: string, _atMs: number): void { return; }

  /** Called when a task's `cancel()` method is invoked. */
  protected onCancel(_id: string): void { return; }

  /** Called at the end of `cancelAll()`. */
  protected onCancelAll(): void { return; }

  /** Called at the start of `advance()`, before the counter is incremented. */
  protected onAdvance(_deltaMs: number): void { return; }

  /** Called at the start of `runUntil()`. */
  protected onRunUntil(_atMs: number): void { return; }

  /**
   * Called after `runUntil` or `runAll` empties the heap (no pending tasks remain).
   * Also called after `cancelAll` drains all tasks.
   */
  protected onIdle(): void { return; }

  /**
   * Cancels all pending tasks without advancing virtual time.
   */
  public cancelAll(): void {
    let task = this.#heap.removeMinimum();

    while (task !== undefined) {
      this.#cancelledIds.add(task.id);
      task = this.#heap.removeMinimum();
    }
    this.hooks.invoke('onCancelAll', () => {
      const result = this.onCancelAll();
      return result;
    });
    this.hooks.invoke('onIdle', () => {
      const result = this.onIdle();
      return result;
    });
  }

  /**
   * Schedules `fire` to run once at `atMs` (virtual epoch-ms).
   */
  public scheduleAt(atMs: number, fire: () => Promise<void> | void): ScheduledTaskType {
    const id = this.generateId();
    const pending: PendingTaskType = {
      'atMs': atMs,
      'fire': fire,
      'id': id,
      'intervalMs': 0,
      'variant': 'timeout'
    };

    this.#heap.insert(pending);
    this.hooks.invoke('onSchedule', () => {
      const result = this.onSchedule(id, atMs, 'timeout');
      return result;
    });

    return new CancellableTask(atMs, id, (taskId: string) => {
      this.#cancelledIds.add(taskId);
      this.hooks.invoke('onCancel', () => {
        const result = this.onCancel(taskId);
        return result;
      });
    });
  }

  /**
   * Schedules `fire` to run every `intervalMs` virtual milliseconds.
   * The first fire occurs at `currentTime + intervalMs`.
   */
  public scheduleEvery(intervalMs: number, fire: () => Promise<void> | void): ScheduledTaskType {
    if (intervalMs <= 0) {
      throw new SchedulerError(`scheduleEvery requires intervalMs > 0, received ${intervalMs.toString()}`);
    }

    const id = this.generateId();
    const atMs = this.#counter.nowMs() + intervalMs;
    const pending: PendingTaskType = {
      'atMs': atMs,
      'fire': fire,
      'id': id,
      'intervalMs': intervalMs,
      'variant': 'interval'
    };

    this.#heap.insert(pending);
    this.hooks.invoke('onSchedule', () => {
      const result = this.onSchedule(id, atMs, 'interval');
      return result;
    });

    return new CancellableTask(atMs, id, (taskId: string) => {
      this.#cancelledIds.add(taskId);
      this.hooks.invoke('onCancel', () => {
        const result = this.onCancel(taskId);
        return result;
      });
    });
  }

  /**
   * Advances virtual time by `deltaMs` and fires all tasks due at or before the new time.
   * Interval tasks are rescheduled automatically after each fire.
   */
  public advance(deltaMs: number): void {
    this.hooks.invoke('onAdvance', () => {
      const result = this.onAdvance(deltaMs);
      return result;
    });
    this.#counter.advance(deltaMs);
    this.runUntil(this.#counter.nowMs());
  }

  /**
   * Fires all tasks scheduled at or before `atMs` (regardless of current virtual time).
   * Interval tasks are rescheduled at `task.atMs + task.intervalMs`.
   */
  public runUntil(atMs: number): void {
    this.hooks.invoke('onRunUntil', () => {
      const result = this.onRunUntil(atMs);
      return result;
    });

    for (;;) {
      const peekMs = this.#heap.peekAtMs();

      if (peekMs === undefined || peekMs > atMs) {
        break;
      }

      const task = this.#heap.removeMinimum();

      if (task === undefined) {
        continue;
      }

      if (this.#cancelledIds.has(task.id)) {
        this.#cancelledIds.delete(task.id);
        continue;
      }

      this.hooks.invoke('onFire', () => {
        const result = this.onFire(task.id);
        return result;
      });
      const succeeded = this.#invokeTask(task);

      if (succeeded && task.variant === 'interval' && !this.#cancelledIds.has(task.id)) {
        const nextAtMs = task.atMs + task.intervalMs;
        const rescheduled: PendingTaskType = {
          'atMs': nextAtMs,
          'fire': task.fire,
          'id': task.id,
          'intervalMs': task.intervalMs,
          'variant': 'interval'
        };

        this.#heap.insert(rescheduled);
        this.hooks.invoke('onReschedule', () => {
          const result = this.onReschedule(task.id, nextAtMs);
          return result;
        });
      }
    }

    if (this.#heap.peekAtMs() === undefined) {
      this.hooks.invoke('onIdle', () => {
        const result = this.onIdle();
        return result;
      });
    }
  }

  /**
   * Fires all pending tasks in ascending `atMs` order.
   * Interval tasks are fired once and not rescheduled.
   */
  public runAll(): void {
    for (;;) {
      const task = this.#heap.removeMinimum();

      if (task === undefined) {
        break;
      }

      if (this.#cancelledIds.has(task.id)) {
        this.#cancelledIds.delete(task.id);
        continue;
      }

      this.hooks.invoke('onFire', () => {
        const result = this.onFire(task.id);
        return result;
      });
      this.#invokeTask(task);
    }

    this.hooks.invoke('onIdle', () => {
      const result = this.onIdle();
      return result;
    });
  }
}
