export interface WorkerTransportInterface<TWorker, TRequest, TResponse> {
  request(worker: TWorker, request: TRequest): Promise<TResponse>;
}
