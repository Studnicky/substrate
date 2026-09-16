import type { OperationFunctionInterface } from './OperationFunctionInterface.js';

/**
 * A synchronous or asynchronous policy that surrounds an operation.
 *
 * Call `next(context)` to continue the operation chain. The result type stays
 * generic so one policy chain can surround operations with different results.
 */
export interface OperationInterceptorInterface<TContext> {
  <TResult>(
    context: TContext,
    next: OperationFunctionInterface<TContext, TResult>
  ): Promise<TResult> | TResult;
}
