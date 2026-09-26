/** Handle returned by `DeadlineTimerInterface.scheduleAt()`. */
export interface DeadlineTimerHandleInterface {
  /** Clears the scheduled fire if it has not run yet. Idempotent. */
  cancel(): void;
}
