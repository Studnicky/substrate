/**
 * `Delay` — static utilities that resolve a `Promise` after a scheduled delay.
 * Composes with `SchedulerProviderType` and `ClockProviderType` so callers can
 * inject a `VirtualScheduler` + `VirtualClockProvider` pair (sharing a
 * `VirtualTimeCounter`) to resolve deterministically under advanced virtual
 * time instead of waiting on real timers.
 *
 * @module
 */
import { type ClockProviderType, RealTimeClockProvider } from '@studnicky/clock';

import type { SchedulerProviderType } from '../interfaces/SchedulerProviderType.js';

import { RealTimeScheduler } from '../scheduler/RealTimeScheduler.js';

/** Options for `Delay.sleep` and `Delay.value`. */
type DelayOptionsType = {
  /** Clock used to compute the absolute fire time. Default: `RealTimeClockProvider`. */
  readonly 'clock'?: ClockProviderType;
  /** Scheduler used to fire the delay. Default: `RealTimeScheduler`. */
  readonly 'scheduler'?: SchedulerProviderType;
};

/**
 * Static utilities for resolving a `Promise` after `ms` milliseconds via an
 * injectable `SchedulerProviderType` and `ClockProviderType`.
 */
export class Delay {
  /**
   * Resolves after `ms` milliseconds have elapsed on `options.clock`.
   * Pass a `VirtualScheduler` and a `VirtualClockProvider` sharing the same
   * `VirtualTimeCounter` to resolve deterministically as virtual time advances.
   */
  public static sleep(ms: number, options: DelayOptionsType = {}): Promise<void> {
    const scheduler = options.scheduler ?? RealTimeScheduler.create();
    const clock = options.clock ?? RealTimeClockProvider.create();
    const atMs = clock.now() + ms;

    return new Promise<void>((resolve) => {
      scheduler.scheduleAt(atMs, () => { resolve(); });
    });
  }

  /** Resolves with `value` after `ms` milliseconds. Same semantics as `sleep`. */
  public static value<T>(ms: number, value: T, options: DelayOptionsType = {}): Promise<T> {
    const scheduler = options.scheduler ?? RealTimeScheduler.create();
    const clock = options.clock ?? RealTimeClockProvider.create();
    const atMs = clock.now() + ms;

    return new Promise<T>((resolve) => {
      scheduler.scheduleAt(atMs, () => { resolve(value); });
    });
  }
}
