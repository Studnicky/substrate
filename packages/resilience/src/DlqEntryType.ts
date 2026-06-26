export type DlqEntryType<T> = {
  'enqueuedAtMs': number;
  'error': Error | undefined;
  'id': string;
  'item': T;
  'reason': string;
};
