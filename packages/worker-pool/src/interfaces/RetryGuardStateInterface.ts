import type { RetryGuardStateEntity } from '../entities/RetryGuardStateEntity.js';

/** Wraps `RetryGuardStateEntity.Type` in the `{ readonly variant }` shape `StateMachine` requires. */
export interface RetryGuardStateInterface {
  readonly 'variant': RetryGuardStateEntity.Type;
}
