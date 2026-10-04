import type { VectorEntryDataEntity } from '../entities/VectorEntryDataEntity.js';

export interface VectorEntryInterface extends VectorEntryDataEntity.Type {
  readonly 'vector': Float32Array;
}
