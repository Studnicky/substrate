/** Default `DeadlineTimerInterface` — real wall-clock time via `Date.now()`/`setTimeout()`. */
import type { DeadlineTimerHandleInterface } from './interfaces/DeadlineTimerHandleInterface.js';
import type { DeadlineTimerInterface } from './interfaces/DeadlineTimerInterface.js';

export class RealDeadlineTimer implements DeadlineTimerInterface {
  protected constructor() {}

  static create(): RealDeadlineTimer {
    const result = new RealDeadlineTimer();
    return result;
  }

  now(): number {
    const result = Date.now();
    return result;
  }

  /** Clamps a past `atMs` to fire on the next tick rather than passing a negative delay to `setTimeout`. */
  scheduleAt(atMs: number, fire: () => void): DeadlineTimerHandleInterface {
    const delayMs = Math.max(0, atMs - Date.now());
    const handle = setTimeout(fire, delayMs);
    const result: DeadlineTimerHandleInterface = {
      'cancel': function cancel(): void {
        clearTimeout(handle);
      }
    };
    return result;
  }
}
