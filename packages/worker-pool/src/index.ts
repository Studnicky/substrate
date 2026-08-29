/**
 * @studnicky/worker-pool
 *
 * Bounded node:worker_threads pool that fans work items across workers via a typed message
 * envelope, composing @studnicky/batch, @studnicky/system, and @studnicky/signal.
 */

export { WorkerPoolError } from './errors/index.js';
export type { WorkerFactoryInterface, WorkerLeaseInterface, WorkerLeasePoolOptionsInterface, WorkerObservationInterface, WorkerPoolConfigInterface, WorkerTransportInterface } from './interfaces/index.js';
export { WorkerLeasePool } from './WorkerLeasePool.js';
export { WorkerPool } from './WorkerPool.js';
