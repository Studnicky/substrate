import type { DeadlineTimerInterface } from './DeadlineTimerInterface.js';

/** Options accepted by `Signal.compose()`. */
export interface SignalComposeOptionsInterface {
  readonly 'deadlineMs'?: number;
  readonly 'signal'?: AbortSignal;
  /** Timer used to fire the deadline timeout. Default: real wall-clock timer. */
  readonly 'timer'?: DeadlineTimerInterface;
}
