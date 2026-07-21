import type { WorkerErrorEnvelopeEntity } from '../entities/WorkerErrorEnvelopeEntity.js';

/** Worker envelope reporting a task failure. */
export interface WorkerErrorEnvelopeInterface {
  readonly 'error': WorkerErrorEnvelopeEntity.Type['error'];
  readonly 'type': WorkerErrorEnvelopeEntity.Type['type'];
}
