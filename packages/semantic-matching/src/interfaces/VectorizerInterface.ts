import type { VectorizationInputInterface } from './VectorizationInputInterface.js';

export interface VectorizerInterface {
  embed(input: VectorizationInputInterface): Promise<Float32Array>;
  getModelIdentity(): string;
  getVectorDimension(): number;
}
