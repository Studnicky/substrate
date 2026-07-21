import type { WorkerResultEnvelopeDiscriminantEntity } from '../entities/WorkerResultEnvelopeDiscriminantEntity.js';

/** Worker envelope carrying a completed task result. */
export interface WorkerResultEnvelopeInterface<TResult = unknown> {
  readonly 'type': WorkerResultEnvelopeDiscriminantEntity.Type['type'];
  readonly 'value': TResult;
}
