import type { SemaphoreWaiterTransitionTypeEntity } from '../entities/SemaphoreWaiterTransitionTypeEntity.js';

/** Requests a per-waiter lifecycle transition. */
export interface SemaphoreWaiterTransitionEventInterface {
  readonly 'type': SemaphoreWaiterTransitionTypeEntity.Type;
}
