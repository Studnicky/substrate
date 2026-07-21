import type { WorkerLogEnvelopeEntity } from '../entities/WorkerLogEnvelopeEntity.js';

/** Worker envelope carrying an observational log message. */
export interface WorkerLogEnvelopeInterface {
  readonly 'message': WorkerLogEnvelopeEntity.Type['message'];
  readonly 'type': WorkerLogEnvelopeEntity.Type['type'];
}
