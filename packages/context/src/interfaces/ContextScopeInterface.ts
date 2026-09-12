/**
 * Represents an active context scope for executing functions with isolated context state.
 */
export interface ContextScopeInterface {
  /**
   * Awaits a value while restoring this scope's storage before continuation.
   */
  await<TResult>(value: TResult | PromiseLike<TResult>): Promise<Awaited<TResult>>;

  /**
   * Binds a callback to this scope's storage.
   */
  bind<TArguments extends readonly unknown[], TResult>(
    callback: (...argumentList: TArguments) => TResult
  ): (...argumentList: TArguments) => TResult;

  /**
   * Execute a function within this context scope.
   */
  execute<TResult>(callback: () => TResult): TResult;

  /**
   * Terminate the scope, extracting final state and preventing further execution.
   */
  terminate(): Record<string, unknown>;
}
