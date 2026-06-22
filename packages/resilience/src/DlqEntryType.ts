export type DlqEntryType<T> = {
  readonly 'enqueuedAtMs': number;
  readonly 'error': Error | undefined;
  readonly 'id': string;
  readonly 'item': T;
  readonly 'reason': string;
};
