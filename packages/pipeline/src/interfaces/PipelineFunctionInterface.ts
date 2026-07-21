/** A synchronous or asynchronous pipeline transformation stage. */
export interface PipelineFunctionInterface<T> {
  (ctx: T): Promise<T> | T;
}
