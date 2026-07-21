/**
 * `Delay` — static utilities that resolve a `Promise` after a scheduled delay.
 * Composes with `SchedulerProviderInterface` and `ClockProviderInterface` so callers can
 * inject a `VirtualScheduler` + `VirtualClockProvider` pair (sharing a
 * `VirtualTimeCounter`) to resolve deterministically under advanced virtual
 * time instead of waiting on real timers.
 *
 * @module
 */
import { type ClockProviderInterface, RealTimeClockProvider } from '@studnicky/clock';

import type { ScheduledTaskInterface } from '../interfaces/ScheduledTaskInterface.js';
import type { SchedulerProviderInterface } from '../interfaces/SchedulerProviderInterface.js';

import { RealTimeScheduler } from '../scheduler/RealTimeScheduler.js';

/** Options for `Delay.sleep`. */
interface DelayOptionsInterface {
  /** Clock used to compute the absolute fire time. Default: `RealTimeClockProvider`. */
  readonly 'clock'?: ClockProviderInterface;
  /** Scheduler used to fire the delay. Default: `RealTimeScheduler`. */
  readonly 'scheduler'?: SchedulerProviderInterface;
  /** Optional cancellation signal. The returned promise rejects with its exact reason. */
  readonly 'signal'?: AbortSignal;
}

/**
 * Static utilities for resolving a `Promise` after `ms` milliseconds via an
 * injectable `SchedulerProviderInterface` and `ClockProviderInterface`.
 */
export class Delay {
  /**
   * Resolves after `ms` milliseconds have elapsed on `options.clock`.
   * Pass a `VirtualScheduler` and a `VirtualClockProvider` sharing the same
   * `VirtualTimeCounter` to resolve deterministically as virtual time advances.
   */
  public static sleep(ms: number, options: DelayOptionsInterface = {}): Promise<void> {
    const signal = options.signal;

    return new Promise<void>((resolve, reject) => {
      let abortListenerAttached = false;
      let outcome: 'aborted' | 'complete' | 'pending' = 'pending';
      let task: ScheduledTaskInterface | undefined;
      const removeAbortListener = (): void => {
        if (!abortListenerAttached) {
          return;
        }
        abortListenerAttached = false;
        signal?.removeEventListener('abort', onAbort);
      };
      const finish = (nextOutcome: 'aborted' | 'complete'): boolean => {
        if (outcome !== 'pending') {
          return false;
        }
        outcome = nextOutcome;
        removeAbortListener();
        return true;
      };
      const abortWon = (): boolean => {
        return outcome === 'aborted';
      };
      const onAbort = (): void => {
        if (!finish('aborted')) {
          return;
        }
        reject(signal?.reason);
        task?.cancel();
      };

      if (signal !== undefined) {
        signal.addEventListener('abort', onAbort, { 'once': true });
        abortListenerAttached = true;

        if (signal.aborted) {
          onAbort();
        }
      }

      if (outcome !== 'pending') {
        return;
      }

      try {
        const scheduler = options.scheduler ?? RealTimeScheduler.create();
        const clock = options.clock ?? RealTimeClockProvider.create();
        const atMs = clock.now() + ms;

        if (outcome !== 'pending') {
          return;
        }

        const scheduledTask = scheduler.scheduleAt(atMs, () => {
          if (finish('complete')) {
            resolve();
          }
        });
        task = scheduledTask;

        if (abortWon()) {
          scheduledTask.cancel();
        }
      } catch (error: unknown) {
        if (finish('complete')) {
          reject(error);
        }
      }
    });
  }
}
