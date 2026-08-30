/** Active scope used to isolate one request execution. */
export interface RequestScopeInterface {
  execute<TResult>(callback: () => TResult): TResult;
  terminate(): void;
}
