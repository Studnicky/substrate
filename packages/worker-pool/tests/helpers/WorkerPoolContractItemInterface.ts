/** One unit of work the shared WorkerPool contract submits to a pool. */
export interface WorkerPoolContractItemInterface {
  readonly 'error'?: string;
  readonly 'ms'?: number;
  readonly 'value': string;
}
