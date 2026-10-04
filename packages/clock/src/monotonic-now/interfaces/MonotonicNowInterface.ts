/** Supplies finite, nondecreasing millisecond readings for time arithmetic. */
export interface MonotonicNowInterface {
  (): number;
}
