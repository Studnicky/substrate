import type { BaseError } from '@studnicky/types/browser';

import type { FireOnWorkerErrorEffectEntity } from '../entities/FireOnWorkerErrorEffectEntity.js';
import type { WorkerTaskIndexEntity } from '../entities/WorkerTaskIndexEntity.js';

export interface FireOnWorkerErrorEffectInterface {
  readonly 'error': BaseError;
  readonly 'index': WorkerTaskIndexEntity.Type['index'];
  readonly 'variant': FireOnWorkerErrorEffectEntity.Type['variant'];
}
