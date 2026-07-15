/**
 * `SchedulerProvider` backed by `setTimeout` / `setInterval`.
 * Each scheduled task returns a `ScheduledTask` whose `cancel()` clears the timer.
 * `cancelAll()` clears all tasks tracked by this instance.
 *
 * @module
 */

import type { ScheduledTaskType } from '../types/ScheduledTaskType.js';
import type { SchedulerProviderType } from '../types/SchedulerProviderType.js';

import { RealTimeSchedulerBuilder } from './RealTimeSchedulerBuilder.js';

/** Internal record kept per active timer. */
type ActiveTimerType = {
  readonly 'handle': ReturnType<typeof setTimeout>;
  readonly 'id': string;
  readonly 'variant': 'interval' | 'timeout';
};

/**
 * Unified `ScheduledTask` implementation for both one-shot and interval timers.
 * Cancellation is fully delegated to the provided callback, which handles
 * timer clearing, map removal, and the `onCancel` lifecycle hook.
 */
class RealTimeTask implements ScheduledTaskType {
  public readonly atMs: number;
  public readonly id: string;
  readonly #onCancelCallback: (id: string) => void;

  /**
   * Property write order: atMs, id, #onCancelCallback.
   */
  public constructor(
    atMs: number,
    id: string,
    onCancelCallback: (id: string) => void
  ) {
    this.atMs = atMs;
    this.id = id;
    this.#onCancelCallback = onCancelCallback;
  }

  /** Cancels the underlying timer via the cancel callback. No-op if already fired/cancelled. */
  public cancel(): void {
    this.#onCancelCallback(this.id);
  }
}

/**
 * Real-time `SchedulerProvider` using `setTimeout` and `setInterval`.
 * Instantiate once per scheduler context; inject as a `SchedulerProviderType`.
 *
 * Subclass extension seams:
 * - `generateId()` — override to control task ID generation
 * - `createTimeout(fire, delayMs)` — override to substitute the timer backend
 * - `createInterval(fire, intervalMs)` — override to substitute the timer backend
 * - `clearTimer(handle, variant)` — override to control timer clearing
 * - Lifecycle hooks: `onSchedule`, `onFire`, `onFireError`, `onDrift`, `onMiss`,
 *   `onCancel`, `onCancelAll`, `onIdle`
 */
export class RealTimeScheduler implements SchedulerProviderType {
  /** Map from task ID to active timer. */
  readonly #timers: Map<string, ActiveTimerType>;
  #idCounter: number;

  #invokeHook(invoke: () => void): void {
    try {
      invoke();
    } catch {}
  }

  /**
   * Property write order: #timers, #idCounter.
   */
  protected constructor() {
    this.#timers = new Map();
    this.#idCounter = 0;
  }

  /** Creates a new `RealTimeScheduler` instance. */
  static create(): RealTimeScheduler {
    return new this();
  }

  /** Returns a `RealTimeSchedulerBuilder` pre-wired to create `RealTimeScheduler` instances. */
  static builder(): RealTimeSchedulerBuilder {
    const result = RealTimeSchedulerBuilder.create(() => { const instance = RealTimeScheduler.create(); return instance; });
    return result;
  }

  /** Returns a unique task ID. Override to customise the ID format. */
  protected generateId(): string {
    this.#idCounter = this.#idCounter + 1;
    return `task-${this.#idCounter.toString()}`;
  }

  /** Creates a one-shot timer. Override to substitute the timer backend. */
  protected createTimeout(fire: () => void, delayMs: number): ReturnType<typeof setTimeout> {
    const result = setTimeout(fire, delayMs);
    return result;
  }

  /** Creates a repeating timer. Override to substitute the timer backend. */
  protected createInterval(fire: () => void, intervalMs: number): ReturnType<typeof setInterval> {
    const result = setInterval(fire, intervalMs);
    return result;
  }

  /** Clears a timer handle. Override to control timer clearing. */
  protected clearTimer(
    handle: ReturnType<typeof setTimeout>  ,
    variant: 'interval' | 'timeout'
  ): void {
    if (variant === 'interval') {
      clearInterval(handle);
    } else {
      clearTimeout(handle);
    }
  }

  /** Called after a task is registered via `scheduleAt` or `scheduleEvery`. */
  protected onSchedule(_id: string, _atMs: number, _variant: 'interval' | 'timeout'): void { return; }

  /** Called inside the timer callback, immediately before `fire` is invoked. */
  protected onFire(_id: string): void { return; }

  /**
   * Called when a fired task's callback throws synchronously or returns a rejected Promise.
   * The error is still silently swallowed by the scheduler — this hook is the only
   * observability seam for task-level failures.
   */
  protected onFireError(_id: string, _error: unknown): void { return; }

  /**
   * Called when a one-shot task fires later than its scheduled `atMs`.
   * Only meaningful for `scheduleAt` — `scheduleEvery` tasks are not tracked against a
   * wall-clock due time in the same way.
   *
   * @param id - Task ID
   * @param dueMs - Originally requested epoch-ms fire time
   * @param actualMs - `Date.now()` at the moment of actual fire
   * @param driftMs - `actualMs - dueMs` (always positive when this hook fires)
   */
  protected onDrift(_id: string, _dueMs: number, _actualMs: number, _driftMs: number): void { return; }

  /**
   * Called when `scheduleAt` receives an `atMs` that is already in the past
   * (`atMs < Date.now()` at scheduling time). The task will still be scheduled
   * to fire at the next event-loop turn.
   *
   * @param id - Task ID
   * @param atMs - The requested (past) fire time
   * @param nowMs - `Date.now()` at the time `scheduleAt` was called
   */
  protected onMiss(_id: string, _atMs: number, _nowMs: number): void { return; }

  /** Called when a task's `cancel()` method is invoked. */
  protected onCancel(_id: string): void { return; }

  /** Called at the end of `cancelAll()`, after all timers have been cleared. */
  protected onCancelAll(): void { return; }

  /**
   * Called after `cancelAll` drains all tracked tasks (no tasks remain active).
   * Not fired on individual `cancel()` calls — only when the scheduler is fully drained.
   */
  protected onIdle(): void { return; }

  /** Cancels and removes all currently-tracked tasks. */
  public cancelAll(): void {
    for (const timer of this.#timers.values()) {
      this.clearTimer(timer.handle, timer.variant);
    }
    this.#timers.clear();
    this.#invokeHook(() => {
      this.onCancelAll();
    });
    this.#invokeHook(() => {
      this.onIdle();
    });
  }

  /**
   * Schedules `fire` once at `atMs` (epoch-ms).
   * If `atMs` is in the past, fires at the next event-loop turn (and `onMiss` fires).
   */
  public scheduleAt(atMs: number, fire: () => Promise<void> | void): ScheduledTaskType {
    const id = this.generateId();
    const scheduleNowMs = Date.now();
    const rawDelayMs = atMs - scheduleNowMs;
    const delayMs = rawDelayMs < 0 ? 0 : rawDelayMs;
    const timers = this.#timers;

    if (rawDelayMs < 0) {
      this.#invokeHook(() => {
        this.onMiss(id, atMs, scheduleNowMs);
      });
    }

    const handle = this.createTimeout(() => {
      timers.delete(id);
      this.#invokeHook(() => {
        this.onFire(id);
      });

      const fireNowMs = Date.now();
      const drift = fireNowMs - atMs;

      if (drift > 0) {
        this.#invokeHook(() => {
          this.onDrift(id, atMs, fireNowMs, drift);
        });
      }

      let result: Promise<void> | void;

      try {
        result = fire();
      } catch (error: unknown) {
        this.#invokeHook(() => {
          this.onFireError(id, error);
        });
        return;
      }

      if (result instanceof Promise) {
        result.catch((error: unknown) => {
          this.#invokeHook(() => {
            this.onFireError(id, error);
          });
        });
      }
    }, delayMs);

    const activeTimer: ActiveTimerType = {
      'handle': handle,
      'id': id,
      'variant': 'timeout'
    };

    timers.set(id, activeTimer);

    const task = new RealTimeTask(atMs, id, (taskId: string) => {
      const timer = timers.get(taskId);

      if (timer === undefined) {
        return;
      }
      this.clearTimer(timer.handle, timer.variant);
      timers.delete(taskId);
      this.#invokeHook(() => {
        this.onCancel(taskId);
      });
    });

    this.#invokeHook(() => {
      this.onSchedule(id, atMs, 'timeout');
    });

    return task;
  }

  /**
   * Schedules `fire` to run repeatedly every `intervalMs` milliseconds.
   */
  public scheduleEvery(intervalMs: number, fire: () => Promise<void> | void): ScheduledTaskType {
    const id = this.generateId();
    const atMs = Date.now() + intervalMs;
    const timers = this.#timers;

    const handle = this.createInterval(() => {
      this.#invokeHook(() => {
        this.onFire(id);
      });
      let result: Promise<void> | void;

      try {
        result = fire();
      } catch (error: unknown) {
        this.#invokeHook(() => {
          this.onFireError(id, error);
        });
        return;
      }

      if (result instanceof Promise) {
        result.catch((error: unknown) => {
          this.#invokeHook(() => {
            this.onFireError(id, error);
          });
        });
      }
    }, intervalMs);

    const activeTimer: ActiveTimerType = {
      'handle': handle,
      'id': id,
      'variant': 'interval'
    };

    timers.set(id, activeTimer);

    const task = new RealTimeTask(atMs, id, (taskId: string) => {
      const timer = timers.get(taskId);

      if (timer === undefined) {
        return;
      }
      this.clearTimer(timer.handle, timer.variant);
      timers.delete(taskId);
      this.#invokeHook(() => {
        this.onCancel(taskId);
      });
    });

    this.#invokeHook(() => {
      this.onSchedule(id, atMs, 'interval');
    });

    return task;
  }
}
