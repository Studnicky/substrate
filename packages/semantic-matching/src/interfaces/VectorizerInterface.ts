import type { VectorizationInputEntity } from '../entities/VectorizationInputEntity.js';

export interface VectorizerInterface {
  embed(input: VectorizationInputEntity.Type): Promise<Float32Array>;
  getModelIdentity(): string;
  getVectorDimension(): number;
}
