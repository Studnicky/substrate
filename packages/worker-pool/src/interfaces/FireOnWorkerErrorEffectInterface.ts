import type { FireOnWorkerErrorEffectEntity } from '../entities/FireOnWorkerErrorEffectEntity.js';
import type { WorkerTaskIndexEntity } from '../entities/WorkerTaskIndexEntity.js';

export interface FireOnWorkerErrorEffectInterface {
  readonly 'error': Error;
  readonly 'index': WorkerTaskIndexEntity.Type['index'];
  readonly 'variant': FireOnWorkerErrorEffectEntity.Type['variant'];
}
