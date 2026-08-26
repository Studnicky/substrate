import type { SemaphoreGrantTransitionTypeEntity } from '../entities/SemaphoreGrantTransitionTypeEntity.js';

/** Requests a transition of `Semaphore`'s waiter-granting reentrancy guard. */
export interface SemaphoreGrantTransitionEventInterface {
  readonly 'type': SemaphoreGrantTransitionTypeEntity.Type;
}
