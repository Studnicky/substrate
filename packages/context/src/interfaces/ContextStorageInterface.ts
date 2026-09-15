export interface ContextStorageInterface {
  await<TResult>(
    store: Map<string, unknown>,
    value: TResult | PromiseLike<TResult>
  ): Promise<Awaited<TResult>>;

  bind<TArguments extends readonly unknown[], TResult>(
    store: Map<string, unknown>,
    callback: (...argumentList: TArguments) => TResult
  ): (...argumentList: TArguments) => TResult;

  getStore(): Map<string, unknown> | undefined;

  run<TResult>(store: Map<string, unknown>, callback: () => TResult): TResult;
}
