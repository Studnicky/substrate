/** A synchronous or asynchronous pipeline transformation stage. */
export interface PipelineFunctionInterface<T> {
  (context: T): Promise<T> | T;
}
