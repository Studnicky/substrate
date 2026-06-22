export type TokenBucketOptionsType = {
  readonly 'burstSize': number;
  readonly 'clock'?: () => number;
  readonly 'requestsPerSecond': number;
};
