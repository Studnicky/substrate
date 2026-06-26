export type PendingTaskType = {
  'atMs': number;
  'fire': () => Promise<void> | void;
  'id': string;
  'intervalMs': number;
  'variant': 'interval' | 'timeout';
};
