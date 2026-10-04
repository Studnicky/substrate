import type { OperationRejectedEventEntity } from '../entities/OperationRejectedEventEntity.js';

/** Runtime lifecycle event that adds a non-JSON Error value to its canonical discriminator. */
export interface OperationRejectedEventInterface extends OperationRejectedEventEntity.Type {
  readonly 'reason': Error;
}
