/**
 * @studnicky/worker-pool
 *
 * Portable worker-pool contracts and lease pooling.
 */

export { WorkerPoolError } from './errors/index.js';
export type { WorkerFactoryInterface, WorkerLeaseInterface, WorkerLeasePoolOptionsInterface, WorkerObservationInterface, WorkerPoolInterface, WorkerTransportInterface } from './interfaces/index.js';
export { WorkerLeasePool } from './WorkerLeasePool.js';
