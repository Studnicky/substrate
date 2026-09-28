/** Result of aborting a Throttle. Computed internally from live counters; never externally validated. */
export interface AbortResultInterface {
  readonly 'cancelled': number;
  readonly 'completed': number;
  readonly 'timedOut': boolean;
}
