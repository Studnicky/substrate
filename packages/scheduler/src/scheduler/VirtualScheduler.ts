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

import type { PendingTaskType } from '../interfaces/PendingTaskType.js';
import type { ScheduledTaskType } from '../interfaces/ScheduledTaskType.js';
import type { SchedulerProviderType } from '../interfaces/SchedulerProviderType.js';

import { MinimumHeap } from './MinimumHeap.js';

/**
 * `ScheduledTask` implementation backed by a cancel callback.
 * Calling `cancel()` invokes the callback, which adds this task's ID to the
 * shared cancelled set and fires the `onCancel` lifecycle hook.
 */
class VirtualTask implements ScheduledTaskType {
  public readonly atMs: number;
  public readonly id: string;
  readonly #onCancelCallback: (id: string) => void;

  /**
   * Property write order: atMs, id, #onCancelCallback.
   */
  public constructor(atMs: number, id: string, onCancelCallback: (id: string) => void) {
    this.atMs = atMs;
    this.id = id;
    this.#onCancelCallback = onCancelCallback;
  }

  /** Marks this task as cancelled by invoking the cancel callback. */
  public cancel(): void {
    this.#onCancelCallback(this.id);
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
 * - Lifecycle hooks: `onSchedule`, `onFire`, `onCancel`, `onCancelAll`, `onAdvance`, `onRunUntil`
 */
export class VirtualScheduler implements SchedulerProviderType {
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
  public constructor(counter: Readonly<VirtualTimeCounter>) {
    this.#cancelledIds = new Set();
    this.#counter = counter;
    this.#idCounter = 0;
    this.#heap = this.createHeap();
  }

  /** Returns a unique task ID. Override to customise the ID format. */
  protected generateId(): string {
    this.#idCounter = this.#idCounter + 1;
    return `vtask-${this.#idCounter.toString()}`;
  }

  /** Creates the heap used to store pending tasks. Override to substitute a custom heap. */
  protected createHeap(): MinimumHeap {
    return new MinimumHeap();
  }

  /** Protected access to the shared virtual time counter. */
  protected get virtualCounter(): Readonly<VirtualTimeCounter> {
    return this.#counter;
  }

  /** Returns `true` if the given task ID has been cancelled. */
  protected isCancelled(id: string): boolean {
    return this.#cancelledIds.has(id);
  }

  /** Called after a task is inserted into the heap via `scheduleAt` or `scheduleEvery`. */
  protected onSchedule(_id: string, _atMs: number, _variant: 'interval' | 'timeout'): void { return; }

  /** Called immediately before a task's `fire` callback is invoked. */
  protected onFire(_id: string): void { return; }

  /** Called when a task's `cancel()` method is invoked. */
  protected onCancel(_id: string): void { return; }

  /** Called at the end of `cancelAll()`. */
  protected onCancelAll(): void { return; }

  /** Called at the start of `advance()`, before the counter is incremented. */
  protected onAdvance(_deltaMs: number): void { return; }

  /** Called at the start of `runUntil()`. */
  protected onRunUntil(_atMs: number): void { return; }

  /**
   * Cancels all pending tasks without advancing virtual time.
   */
  public cancelAll(): void {
    let task = this.#heap.removeMinimum();

    while (task !== undefined) {
      this.#cancelledIds.add(task.id);
      task = this.#heap.removeMinimum();
    }
    this.onCancelAll();
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
    this.onSchedule(id, atMs, 'timeout');

    return new VirtualTask(atMs, id, (taskId: string) => {
      this.#cancelledIds.add(taskId);
      this.onCancel(taskId);
    });
  }

  /**
   * Schedules `fire` to run every `intervalMs` virtual milliseconds.
   * The first fire occurs at `currentTime + intervalMs`.
   */
  public scheduleEvery(intervalMs: number, fire: () => Promise<void> | void): ScheduledTaskType {
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
    this.onSchedule(id, atMs, 'interval');

    return new VirtualTask(atMs, id, (taskId: string) => {
      this.#cancelledIds.add(taskId);
      this.onCancel(taskId);
    });
  }

  /**
   * Advances virtual time by `deltaMs` and fires all tasks due at or before the new time.
   * Interval tasks are rescheduled automatically after each fire.
   */
  public advance(deltaMs: number): void {
    this.onAdvance(deltaMs);
    this.#counter.advance(deltaMs);
    this.runUntil(this.#counter.nowMs());
  }

  /**
   * Fires all tasks scheduled at or before `atMs` (regardless of current virtual time).
   * Interval tasks are rescheduled at `task.atMs + task.intervalMs`.
   */
  public runUntil(atMs: number): void {
    this.onRunUntil(atMs);

    for (;;) {
      const peekMs = this.#heap.peekAtMs();

      if (peekMs === undefined || peekMs > atMs) {
        break;
      }

      const task = this.#heap.removeMinimum();

      if (task === undefined || this.#cancelledIds.has(task.id)) {
        continue;
      }

      this.onFire(task.id);
      const fireResult = task.fire();

      if (fireResult instanceof Promise) {
        fireResult.catch(() => {
          return;
        });
      }

      if (task.variant === 'interval' && !this.#cancelledIds.has(task.id)) {
        const rescheduled: PendingTaskType = {
          'atMs': task.atMs + task.intervalMs,
          'fire': task.fire,
          'id': task.id,
          'intervalMs': task.intervalMs,
          'variant': 'interval'
        };

        this.#heap.insert(rescheduled);
      }
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
        continue;
      }

      this.onFire(task.id);
      const fireResult = task.fire();

      if (fireResult instanceof Promise) {
        fireResult.catch(() => {
          return;
        });
      }
    }
  }
}
