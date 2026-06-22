export type DeadLetterQueueOptionsType = {
  readonly 'capacity'?: number;
  readonly 'clock'?: () => number;
  readonly 'signal'?: AbortSignal;
};
