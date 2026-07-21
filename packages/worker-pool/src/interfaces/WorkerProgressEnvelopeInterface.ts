import type { WorkerProgressEnvelopeEntity } from '../entities/WorkerProgressEnvelopeEntity.js';

/** Worker envelope reporting task progress. */
export interface WorkerProgressEnvelopeInterface {
  readonly 'percent': WorkerProgressEnvelopeEntity.Type['percent'];
  readonly 'type': WorkerProgressEnvelopeEntity.Type['type'];
}
