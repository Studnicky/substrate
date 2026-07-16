// json-schema-uninexpressible: 'fire' is a function type (the scheduled callback), not representable
// in JSON Schema.
export type PendingTaskType = {
  'atMs': number;
  'fire': () => Promise<void> | void;
  'id': string;
  'intervalMs': number;
  'variant': 'interval' | 'timeout';
};
