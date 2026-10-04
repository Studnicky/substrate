export interface ContextRunResultInterface<TResult> {
  readonly 'snapshot': ReadonlyMap<string, unknown>;
  readonly 'value': TResult;
}
