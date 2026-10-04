import type { DeadlineTimerInterface } from './interfaces/DeadlineTimerInterface.js';
import type { RaceTimeoutOptionsInterface } from './interfaces/RaceTimeoutOptionsInterface.js';

import { RealDeadlineTimer } from './RealDeadlineTimer.js';

/**
 * Races a timer against an optional AbortSignal, tearing down whichever side loses.
 * `RaceTimeout.wait()` is the real-timer default; `RaceTimeout.create({ timer })` injects a
 * `DeadlineTimerInterface` (e.g. a virtual one in tests) without changing either call shape.
 */
export class RaceTimeout {
  static #defaultInstance: RaceTimeout | undefined;

  readonly #timer: DeadlineTimerInterface;

  protected constructor(timer: DeadlineTimerInterface) {
    this.#timer = timer;
  }

  static create(options: RaceTimeoutOptionsInterface = {}): RaceTimeout {
    const result = new RaceTimeout(options.timer ?? RealDeadlineTimer.create());
    return result;
  }

  /** Real-timer convenience matching the historical two-argument call shape. */
  static async wait(ms: number, signal: AbortSignal | undefined): Promise<'timeout' | 'aborted'> {
    RaceTimeout.#defaultInstance ??= RaceTimeout.create();
    const result = await RaceTimeout.#defaultInstance.wait(ms, signal);
    return result;
  }

  async wait(ms: number, signal: AbortSignal | undefined): Promise<'timeout' | 'aborted'> {
    if (signal?.aborted === true) {
      return 'aborted';
    }

    const timer = this.#timer;

    return await new Promise<'timeout' | 'aborted'>((resolve) => {
      const onAbort = (): void => {
        handle.cancel();
        resolve('aborted');
      };

      const handle = timer.scheduleAt(timer.now() + ms, () => {
        signal?.removeEventListener('abort', onAbort);
        resolve('timeout');
      });

      signal?.addEventListener('abort', onAbort, { 'once': true });
    });
  }
}
