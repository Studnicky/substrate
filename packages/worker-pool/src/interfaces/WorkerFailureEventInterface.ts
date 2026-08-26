import type { WorkerFailureEventEntity } from '../entities/WorkerFailureEventEntity.js';
import type { WorkerTaskIndexEntity } from '../entities/WorkerTaskIndexEntity.js';

export interface WorkerFailureEventInterface {
  readonly 'error': Error;
  readonly 'index': WorkerTaskIndexEntity.Type['index'];
  readonly 'type': WorkerFailureEventEntity.Type['type'];
}
