import type { WorkerResultEnvelopeKindEntity } from '../entities/WorkerResultEnvelopeKindEntity.js';

/** Worker envelope carrying a completed task result. */
export interface WorkerResultEnvelopeInterface<TResult = unknown> {
  readonly 'type': WorkerResultEnvelopeKindEntity.Type;
  readonly 'value': TResult;
}
