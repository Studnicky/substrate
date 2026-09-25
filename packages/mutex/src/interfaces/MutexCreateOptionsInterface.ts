import type { ClockProviderInterface } from '@studnicky/clock/browser';

import type { MutexConfigEntity } from '../entities/MutexConfigEntity.js';

/** Runtime collaborators and serializable settings accepted by `Mutex.create`. */
export interface MutexCreateOptionsInterface extends MutexConfigEntity.InputType {
  /** Clock that measures acquisition waits and lock holds. Default: `RealTimeClockProvider`. */
  readonly 'clock'?: ClockProviderInterface;
}
