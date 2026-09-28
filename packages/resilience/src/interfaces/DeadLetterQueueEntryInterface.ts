/** `enqueuedAtMs`/`id` are computed internally (clock, `crypto.randomUUID()`); never externally validated. */
export interface DeadLetterQueueEntryInterface<T> {
  'enqueuedAtMs': number;
  'error': Error | undefined;
  'id': string;
  'item': T;
  'reason': string;
}
