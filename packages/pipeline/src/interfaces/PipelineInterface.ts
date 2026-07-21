/**
 * Interface for a typed async pipeline
 */
export interface PipelineInterface<T> {
  /**
   * Run the context through all registered transforms in order
   */
  run(ctx: T): Promise<T>;
}
