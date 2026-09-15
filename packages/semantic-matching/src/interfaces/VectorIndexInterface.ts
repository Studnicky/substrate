import type { VectorMatchEntity } from '../entities/VectorMatchEntity.js';
import type { VectorSearchOptionsEntity } from '../entities/VectorSearchOptionsEntity.js';
import type { VectorEntryInterface } from './VectorEntryInterface.js';

export interface VectorIndexInterface {
  delete(id: string, namespace: string): Promise<void>;
  search(vector: Float32Array, options: VectorSearchOptionsEntity.Type): Promise<readonly VectorMatchEntity.Type[]>;
  upsert(entry: VectorEntryInterface): Promise<void>;
}
