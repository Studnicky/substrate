/** A synchronous or asynchronous operation that receives a typed context. */
export interface OperationFunctionInterface<TContext, TResult> {
  (context: TContext): Promise<TResult> | TResult;
}
