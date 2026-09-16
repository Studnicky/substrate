import type { OperationFunctionInterface } from './OperationFunctionInterface.js';

/** Runs a supplied operation through a typed policy chain. */
export interface OperationPipelineInterface<TContext> {
  /**
   * Runs an operation through the pipeline.
   *
   * @param context - Typed context passed to every policy and the operation.
   * @param operation - The final operation in the chain.
   * @returns The operation result.
   */
  run<TResult>(
    context: TContext,
    operation: OperationFunctionInterface<TContext, TResult>
  ): Promise<TResult>;
}
