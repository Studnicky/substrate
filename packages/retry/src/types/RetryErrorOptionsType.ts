/** Options for RetryError construction. */
// json-schema-uninexpressible: 'cause' and 'errors' hold Error class instances — not a serializable data shape
export type RetryErrorOptionsType = {
  'cause'?: Error;
  'code'?: string;
  'errors'?: Error[];
};
