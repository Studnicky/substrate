/**
 * `SchedulerProvider` backed by `setTimeout` / `setInterval`.
 * Each scheduled task returns a `ScheduledTask` whose `cancel()` clears the timer.
 * `cancelAll()` clears all tasks tracked by this instance.
 *
 * @module
 */
import type { ScheduledTaskType } from '../interfaces/ScheduledTaskType.js';
import type { SchedulerProviderType } from '../interfaces/SchedulerProviderType.js';

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
 * - Lifecycle hooks: `onSchedule`, `onFire`, `onCancel`, `onCancelAll`
 */
export class RealTimeScheduler implements SchedulerProviderType {
  /** Map from task ID to active timer. */
  readonly #timers: Map<string, ActiveTimerType>;
  #idCounter: number;

  /**
   * Property write order: #timers, #idCounter.
   */
  public constructor() {
    this.#timers = new Map();
    this.#idCounter = 0;
  }

  /** Returns a unique task ID. Override to customise the ID format. */
  protected generateId(): string {
    this.#idCounter = this.#idCounter + 1;
    return `task-${this.#idCounter.toString()}`;
  }

  /** Creates a one-shot timer. Override to substitute the timer backend. */
  protected createTimeout(fire: () => void, delayMs: number): ReturnType<typeof setTimeout> {
    return setTimeout(fire, delayMs);
  }

  /** Creates a repeating timer. Override to substitute the timer backend. */
  protected createInterval(fire: () => void, intervalMs: number): ReturnType<typeof setInterval> {
    return setInterval(fire, intervalMs);
  }

  /** Clears a timer handle. Override to control timer clearing. */
  protected clearTimer(
    handle: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>,
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

  /** Called when a task's `cancel()` method is invoked. */
  protected onCancel(_id: string): void { return; }

  /** Called at the end of `cancelAll()`. */
  protected onCancelAll(): void { return; }

  /** Cancels and removes all currently-tracked tasks. */
  public cancelAll(): void {
    for (const timer of this.#timers.values()) {
      this.clearTimer(timer.handle, timer.variant);
    }
    this.#timers.clear();
    this.onCancelAll();
  }

  /**
   * Schedules `fire` once at `atMs` (epoch-ms).
   * If `atMs` is in the past, fires at the next event-loop turn.
   */
  public scheduleAt(atMs: number, fire: () => Promise<void> | void): ScheduledTaskType {
    const id = this.generateId();
    const rawDelayMs = atMs - Date.now();
    const delayMs = rawDelayMs < 0 ? 0 : rawDelayMs;
    const timers = this.#timers;

    const handle = this.createTimeout(() => {
      timers.delete(id);
      this.onFire(id);
      const result = fire();

      if (result instanceof Promise) {
        result.catch(() => {
          return;
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
      this.onCancel(taskId);
    });

    this.onSchedule(id, atMs, 'timeout');

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
      this.onFire(id);
      const result = fire();

      if (result instanceof Promise) {
        result.catch(() => {
          return;
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
      this.onCancel(taskId);
    });

    this.onSchedule(id, atMs, 'interval');

    return task;
  }
}
