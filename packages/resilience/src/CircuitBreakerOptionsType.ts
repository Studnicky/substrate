export type CircuitBreakerOptionsType = {
  readonly 'clock'?: () => number;
  readonly 'failureThreshold': number;
  readonly 'name'?: string;
  readonly 'resetTimeoutMs': number;
  readonly 'successThreshold'?: number;
};
