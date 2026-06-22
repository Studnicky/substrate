/** Options for BusQueue construction. */

export type BusQueueOptionsType = {
  'highWaterMark'?: number;
  'onError'?: (err: unknown) => void;
  'signal'?: AbortSignal;
};
