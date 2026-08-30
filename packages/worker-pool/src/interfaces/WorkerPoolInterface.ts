export interface WorkerPoolInterface<TInput, TOutput> {
  'close': () => Promise<void>;
  'run': (items: readonly TInput[]) => Promise<TOutput[]>;
}
