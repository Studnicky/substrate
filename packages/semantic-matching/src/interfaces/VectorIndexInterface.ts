import type { VectorEntryInterface } from './VectorEntryInterface.js';
import type { VectorMatchInterface } from './VectorMatchInterface.js';
import type { VectorSearchOptionsInterface } from './VectorSearchOptionsInterface.js';

export interface VectorIndexInterface {
  delete(id: string, namespace: string): Promise<void>;
  search(vector: Float32Array, options: VectorSearchOptionsInterface): Promise<readonly VectorMatchInterface[]>;
  upsert(entry: VectorEntryInterface): Promise<void>;
}
