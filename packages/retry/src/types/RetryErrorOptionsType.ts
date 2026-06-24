/** Options for RetryError construction. */
export type RetryErrorOptionsType = {
  readonly 'cause'?: Error;
  readonly 'code'?: string;
  readonly 'errors'?: Error[];
};
