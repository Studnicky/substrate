/**
 * @studnicky/worker-pool
 *
 * Bounded node:worker_threads pool that fans work items across workers via a typed message
 * envelope, composing @studnicky/batch, @studnicky/system, and @studnicky/signal.
 */

export { WorkerErrorEnvelopeEntity } from './entities/WorkerErrorEnvelopeEntity.js';
export { WorkerLogEnvelopeEntity } from './entities/WorkerLogEnvelopeEntity.js';
export { WorkerPoolConfigEntity } from './entities/WorkerPoolConfigEntity.js';
export { WorkerProgressEnvelopeEntity } from './entities/WorkerProgressEnvelopeEntity.js';
export { WorkerResultEnvelopeDiscriminantEntity } from './entities/WorkerResultEnvelopeDiscriminantEntity.js';
export { WorkerTaskDispositionEntity } from './entities/WorkerTaskDispositionEntity.js';
export { WorkerTaskIndexEntity } from './entities/WorkerTaskIndexEntity.js';
export type { WorkerErrorEnvelopeInterface } from './interfaces/WorkerErrorEnvelopeInterface.js';
export type { WorkerLogEnvelopeInterface } from './interfaces/WorkerLogEnvelopeInterface.js';
export type { WorkerPoolConfigInterface } from './interfaces/WorkerPoolConfigInterface.js';
export type { WorkerProgressEnvelopeInterface } from './interfaces/WorkerProgressEnvelopeInterface.js';
export type { WorkerResultEnvelopeInterface } from './interfaces/WorkerResultEnvelopeInterface.js';
export { WorkerPool } from './WorkerPool.js';
