export interface ContextRunResultInterface<TResult> {
  readonly 'snapshot': Record<string, unknown>;
  readonly 'value': TResult;
}
