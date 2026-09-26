import type { DeadlineTimerInterface } from './DeadlineTimerInterface.js';

/** Options accepted by `RaceTimeout.wait()`. */
export interface RaceTimeoutOptionsInterface {
  /** Timer used to fire the timeout side of the race. Default: real wall-clock timer. */
  readonly 'timer'?: DeadlineTimerInterface;
}
