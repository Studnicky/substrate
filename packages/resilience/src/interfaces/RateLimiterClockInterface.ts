/** Supplies finite, nondecreasing millisecond readings for rate-limit arithmetic. */
export interface RateLimiterClockInterface {
  (): number;
}
