/** Runtime statistics for a Throttle instance. Computed internally from live counters; never externally validated. */
export interface ThrottleStatsInterface {
  readonly 'activeCount': number;
  readonly 'adaptive'?: {
    readonly 'adjustmentCount': number;
    readonly 'enabled': boolean;
    readonly 'lastAdjustmentTime': number;
    readonly 'maximumConcurrency': number;
    readonly 'minimumConcurrency': number;
    readonly 'targetLatencyMs': number;
  };
  readonly 'concurrencyLimit': number;
  readonly 'isAborted': boolean;
  readonly 'isDraining': boolean;
  readonly 'latency'?: {
    readonly 'p50'?: number;
    readonly 'p95'?: number;
    readonly 'p99'?: number;
    readonly 'sampleCount': number;
  };
  readonly 'queuedCount': number;
  readonly 'totalExecuted': number;
}
