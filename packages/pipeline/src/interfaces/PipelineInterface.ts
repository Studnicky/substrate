import type { PipelineFunctionInterface } from './PipelineFunctionInterface.js';

/**
 * Interface for a typed async pipeline
 */
export interface PipelineInterface<T> {
  /**
   * Add a transform function to the pipeline
   * @returns Function that removes this transform when called
   */
  add(fn: PipelineFunctionInterface<T>): () => void;

  /**
   * Remove all transform functions
   */
  clear(): void;

  /**
   * Run the context through all registered transforms in order
   */
  run(ctx: T): Promise<T>;
}
