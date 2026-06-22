export type PendingTaskType = {
  readonly 'atMs': number;
  readonly 'fire': () => Promise<void> | void;
  readonly 'id': string;
  readonly 'intervalMs': number;
  readonly 'variant': 'interval' | 'timeout';
};
