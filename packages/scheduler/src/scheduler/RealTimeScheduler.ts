/**
 * `SchedulerProvider` backed by `setTimeout` / `setInterval`.
 * Each scheduled task returns a `ScheduledTask` whose `cancel()` clears the timer.
 * `cancelAll()` clears all tasks tracked by this instance.
 *
 * @module
 */

import { HookInvoker } from '@studnicky/errors';

import type { ScheduledTaskType } from '../types/ScheduledTaskType.js';
import type { SchedulerProviderType } from '../types/SchedulerProviderType.js';

import { CancellableTask } from './CancellableTask.js';
import { RealTimeSchedulerBuilder } from './RealTimeSchedulerBuilder.js';

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

// json-schema-uninexpressible: 'handle' is a ReturnType<typeof setTimeout> — an opaque Node.js runtime
// timer handle object, not a JSON-serializable data shape.
/** Internal record kept per active timer. */
type ActiveTimerType = {
  readonly 'handle': ReturnType<typeof setTimeout>;
  readonly 'id': string;
  readonly 'variant': 'interval' | 'timeout';
};

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
  protected readonly hooks: HookInvoker = new SwallowingHookInvoker();
  /** Map from task ID to active timer. */
  readonly #timers: Map<string, ActiveTimerType>;
  #idCounter: number;

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

  /**
   * Largest delay `setTimeout` accepts before Node silently truncates it (2^31 - 1 ms,
   * ~24.8 days). `scheduleAt` chains through intermediate stages capped at this value
   * for any `atMs` further out than this. Override to substitute a smaller value in tests.
   */
  protected get maxTimeoutDelayMs(): number {
    const result = 2147483647;
    return result;
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
   * Schedules `fire` once at `atMs` (epoch-ms).
   * If `atMs` is in the past, fires at the next event-loop turn (and `onMiss` fires).
   *
   * `setTimeout` silently truncates delays beyond `maxTimeoutDelayMs` (~24.8 days), so
   * an `atMs` further out than that is armed across a chain of intermediate stages, each
   * capped at `maxTimeoutDelayMs`, until the real remaining delay is exhausted. Only the
   * final, terminal stage invokes `fire`/`onFire`/`onDrift` — intermediate stages just
   * re-arm the next stage.
   */
  public scheduleAt(atMs: number, fire: () => Promise<void> | void): ScheduledTaskType {
    const id = this.generateId();
    const scheduleNowMs = Date.now();
    const rawDelayMs = atMs - scheduleNowMs;
    const timers = this.#timers;
    const maxDelayMs = this.maxTimeoutDelayMs;

    if (rawDelayMs < 0) {
      this.hooks.invoke('onMiss', () => {
        const result = this.onMiss(id, atMs, scheduleNowMs);
        return result;
      });
    }

    const armStage = (): void => {
      const remainingDelayMs = atMs - Date.now();
      const isTerminalStage = remainingDelayMs <= maxDelayMs;
      let stageDelayMs: number;

      if (isTerminalStage) {
        stageDelayMs = remainingDelayMs < 0 ? 0 : remainingDelayMs;
      } else {
        stageDelayMs = maxDelayMs;
      }

      const handle = this.createTimeout(() => {
        if (!isTerminalStage) {
          armStage();
          return;
        }

        timers.delete(id);
        this.hooks.invoke('onFire', () => {
          const result = this.onFire(id);
          return result;
        });

        const fireNowMs = Date.now();
        const drift = fireNowMs - atMs;

        if (drift > 0) {
          this.hooks.invoke('onDrift', () => {
            const result = this.onDrift(id, atMs, fireNowMs, drift);
            return result;
          });
        }

        let result: Promise<void> | void;

        try {
          result = fire();
        } catch (error: unknown) {
          this.hooks.invoke('onFireError', () => {
            const result = this.onFireError(id, error);
            return result;
          });
          return;
        }

        if (result instanceof Promise) {
          result.catch((error: unknown) => {
            this.hooks.invoke('onFireError', () => {
              const result = this.onFireError(id, error);
              return result;
            });
          });
        }
      }, stageDelayMs);

      const activeTimer: ActiveTimerType = {
        'handle': handle,
        'id': id,
        'variant': 'timeout'
      };

      timers.set(id, activeTimer);
    };

    armStage();

    const task = new CancellableTask(atMs, id, (taskId: string) => {
      const timer = timers.get(taskId);

      if (timer === undefined) {
        return;
      }
      this.clearTimer(timer.handle, timer.variant);
      timers.delete(taskId);
      this.hooks.invoke('onCancel', () => {
        const result = this.onCancel(taskId);
        return result;
      });
    });

    this.hooks.invoke('onSchedule', () => {
      const result = this.onSchedule(id, atMs, 'timeout');
      return result;
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
      this.hooks.invoke('onFire', () => {
        const result = this.onFire(id);
        return result;
      });
      let result: Promise<void> | void;

      try {
        result = fire();
      } catch (error: unknown) {
        this.hooks.invoke('onFireError', () => {
          const result = this.onFireError(id, error);
          return result;
        });
        return;
      }

      if (result instanceof Promise) {
        result.catch((error: unknown) => {
          this.hooks.invoke('onFireError', () => {
            const result = this.onFireError(id, error);
            return result;
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

    const task = new CancellableTask(atMs, id, (taskId: string) => {
      const timer = timers.get(taskId);

      if (timer === undefined) {
        return;
      }
      this.clearTimer(timer.handle, timer.variant);
      timers.delete(taskId);
      this.hooks.invoke('onCancel', () => {
        const result = this.onCancel(taskId);
        return result;
      });
    });

    this.hooks.invoke('onSchedule', () => {
      const result = this.onSchedule(id, atMs, 'interval');
      return result;
    });

    return task;
  }
}
