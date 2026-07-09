/**
 * @studnicky/worker-pool
 *
 * Bounded node:worker_threads pool that fans work items across workers via a typed message
 * envelope, composing @studnicky/batch, @studnicky/system, and @studnicky/signal.
 */

export type { WorkerEnvelopeType } from './types/WorkerEnvelopeType.js';
export type { WorkerPoolConfigType } from './types/WorkerPoolConfigType.js';
export { WorkerPool } from './WorkerPool.js';
export { WorkerPoolBuilder } from './WorkerPoolBuilder.js';
