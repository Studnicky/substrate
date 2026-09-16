import type { OperationFunctionInterface } from '../interfaces/OperationFunctionInterface.js';
import type { OperationInterceptorInterface } from '../interfaces/OperationInterceptorInterface.js';
import type { OperationPipelineInterface } from '../interfaces/OperationPipelineInterface.js';

/**
 * Runs supplied operations through fixed, ordered interceptors.
 *
 * Each interceptor receives the context and a `next` operation. Calling `next`
 * continues the chain. The declared order is the entry order: the first
 * interceptor surrounds every later interceptor and the supplied operation.
 */
export class OperationPipeline<TContext> implements OperationPipelineInterface<TContext> {
  static create<TContext>(
    interceptors: readonly OperationInterceptorInterface<TContext>[]
  ): OperationPipeline<TContext> {
    return new this<TContext>(interceptors);
  }

  protected constructor(
    private readonly interceptors: readonly OperationInterceptorInterface<TContext>[]
  ) {}

  /**
   * Runs an operation through every interceptor in construction order.
   *
   * @param context - Typed context passed to each interceptor and the operation.
   * @param operation - The final operation in the chain.
   * @returns The supplied operation result.
   * @throws The exact value thrown by an interceptor or the supplied operation.
   */
  async run<TResult>(
    context: TContext,
    operation: OperationFunctionInterface<TContext, TResult>
  ): Promise<TResult> {
    let composedOperation = operation;

    for (let index = this.interceptors.length - 1; index >= 0; index -= 1) {
      const interceptor = this.interceptors[index]!;
      const next = composedOperation;
      composedOperation = (currentContext: TContext): Promise<TResult> | TResult => {
        const result = interceptor(currentContext, next);
        return result;
      };
    }

    const result = await composedOperation(context);
    return result;
  }
}
