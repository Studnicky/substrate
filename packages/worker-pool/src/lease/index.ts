/**
 * Runtime-neutral lease-only worker-pool API.
 */

export { WorkerPoolError } from '../errors/index.js';
export type {
  WorkerFactoryInterface,
  WorkerLeaseInterface,
  WorkerLeasePoolOptionsInterface,
  WorkerObservationInterface,
  WorkerTransportInterface
} from '../interfaces/index.js';
export { WorkerLeasePool } from '../WorkerLeasePool.js';
