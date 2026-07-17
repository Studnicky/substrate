// json-schema-uninexpressible: 'item' is a generic T type parameter and 'error' is an Error class instance — neither is JSON-Schema-expressible
export type DlqEntryType<T> = {
  'enqueuedAtMs': number;
  'error': Error | undefined;
  'id': string;
  'item': T;
  'reason': string;
};
