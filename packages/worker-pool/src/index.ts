/**
 * @studnicky/worker-pool
 *
 * Bounded node:worker_threads pool that fans work items across workers via a typed message
 * envelope, composing @studnicky/batch, @studnicky/system, and @studnicky/signal.
 */

export type { WorkerPoolConfigInterface } from './interfaces/WorkerPoolConfigInterface.js';
export { WorkerPool } from './WorkerPool.js';
